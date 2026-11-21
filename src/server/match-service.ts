import "server-only";
import { and, asc, count, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import type { Database } from "@/db/client";
import { groupMembers, groups, matches, matchSignups, users } from "@/db/schema";
import { absoluteUrl } from "@/lib/app-url";
import { actionEmail, sendEmail } from "@/lib/email";
import { formatEuros, costPerPlayerCents } from "@/lib/domain/money";
import { isDueForClosing, planJoin, planWithdraw } from "@/lib/domain/matches";
import { formatDateTime } from "@/lib/domain/time";
import { ActionError } from "./errors";

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type MatchRow = typeof matches.$inferSelect;

export async function lockMatch(tx: Tx, matchId: string): Promise<MatchRow> {
  const [match] = await tx.select().from(matches).where(eq(matches.id, matchId)).for("update");
  if (!match) throw new ActionError("Ese partido no existe.");
  return match;
}

async function confirmedCount(tx: Tx, matchId: string) {
  const [row] = await tx
    .select({ n: count() })
    .from(matchSignups)
    .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.status, "confirmed")));
  return row?.n ?? 0;
}

/**
 * Closes a (locked) open match: fixes everyone's share and flags it when
 * it didn't reach the minimum (PRD §5.4, §5.6).
 */
export async function closeLockedMatch(tx: Tx, match: MatchRow, now: Date) {
  const n = await confirmedCount(tx, match.id);
  const perPlayer = costPerPlayerCents(match.courtPriceCents, n);
  await tx
    .update(matchSignups)
    .set({ amountDueCents: perPlayer })
    .where(and(eq(matchSignups.matchId, match.id), eq(matchSignups.status, "confirmed")));
  const belowMinimum = n < match.minPlayers;
  const [closed] = await tx
    .update(matches)
    .set({
      status: "closed",
      closedAt: now,
      pricePerPlayerCents: perPlayer,
      belowMinimumAt: belowMinimum ? now : null,
    })
    .where(eq(matches.id, match.id))
    .returning();
  return { match: closed!, belowMinimum };
}

/** Admin action: close sign-ups now. */
export async function closeMatchNow(matchId: string) {
  return db.transaction(async (tx) => {
    const match = await lockMatch(tx, matchId);
    if (match.status !== "open") throw new ActionError("El partido ya no está abierto.");
    return closeLockedMatch(tx, match, new Date());
  });
}

/** Closes every open match whose deadline has passed. Returns the ones below the minimum. */
export async function closeDueMatches(now = new Date()) {
  const due = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.status, "open"), lte(matches.signupDeadline, now)))
    .limit(100);
  const belowMinimum: string[] = [];
  for (const { id } of due) {
    const result = await db.transaction(async (tx) => {
      const match = await lockMatch(tx, id);
      if (!isDueForClosing(match, now)) return null; // closed meanwhile
      return closeLockedMatch(tx, match, now);
    });
    if (result?.belowMinimum) belowMinimum.push(id);
  }
  return { closed: due.length, belowMinimum };
}

/** Emails the group admins of matches that closed below their minimum. */
export async function notifyBelowMinimum(matchIds: string[]) {
  for (const id of matchIds) {
    const [match] = await db
      .select({
        id: matches.id,
        startsAt: matches.startsAt,
        minPlayers: matches.minPlayers,
        groupId: matches.groupId,
        groupName: groups.name,
      })
      .from(matches)
      .innerJoin(groups, eq(groups.id, matches.groupId))
      .where(eq(matches.id, id));
    if (!match) continue;
    const confirmed = await db.$count(
      matchSignups,
      and(eq(matchSignups.matchId, id), eq(matchSignups.status, "confirmed")),
    );
    const admins = await db
      .select({ email: users.email })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(
        and(eq(groupMembers.groupId, match.groupId), eq(groupMembers.role, "admin"), eq(groupMembers.status, "active")),
      );
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `Faltan jugadores: ${match.groupName}, ${formatDateTime(match.startsAt)}`,
        ...actionEmail({
          title: "El partido no ha llegado al mínimo",
          intro: `Se ha cerrado la inscripción con ${confirmed} de ${match.minPlayers} jugadores mínimos. Decide si lo juegas igualmente o lo cancelas.`,
          cta: "Ver partido",
          url: absoluteUrl(`/partidos/${match.id}`),
          footer: "Recibes este correo porque eres admin del grupo en Furbo.",
        }),
      }).catch((err) => console.error("[notifyBelowMinimum]", err));
    }
  }
}

export type JoinOutcome = { status: "confirmed"; closed: boolean } | { status: "waitlist"; position: number };

export async function joinMatch(matchId: string, userId: string): Promise<JoinOutcome> {
  return db.transaction(async (tx) => {
    const now = new Date();
    let match = await lockMatch(tx, matchId);
    if (isDueForClosing(match, now)) match = (await closeLockedMatch(tx, match, now)).match;

    const [current] = await tx
      .select()
      .from(matchSignups)
      .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, userId)));
    const owed = await tx
      .select({ userId: matchSignups.userId, amountDueCents: matchSignups.amountDueCents })
      .from(matchSignups)
      .where(
        and(
          eq(matchSignups.matchId, matchId),
          eq(matchSignups.status, "withdrawn"),
          isNotNull(matchSignups.amountDueCents),
          eq(matchSignups.paid, false),
        ),
      )
      .orderBy(asc(matchSignups.updatedAt));

    const plan = planJoin({
      match,
      now,
      confirmedCount: await confirmedCount(tx, matchId),
      current: current?.status ?? null,
      owed: owed.map((o) => ({ userId: o.userId, amountDueCents: o.amountDueCents! })),
    });

    if (plan.type === "error") {
      throw new ActionError(
        plan.reason === "already"
          ? "Ya estás apuntado."
          : "Este partido ya no admite cambios.",
      );
    }

    if (plan.type === "confirmed") {
      if (plan.releaseUserId && plan.releaseUserId !== userId) {
        await tx
          .update(matchSignups)
          .set({ amountDueCents: null })
          .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, plan.releaseUserId)));
      }
      const values = {
        status: "confirmed" as const,
        positionInQueue: null,
        amountDueCents: plan.amountDueCents,
        paid: false,
        paidAt: null,
      };
      await tx
        .insert(matchSignups)
        .values({ matchId, userId, ...values })
        .onConflictDoUpdate({ target: [matchSignups.matchId, matchSignups.userId], set: values });
      if (plan.closesMatch) await closeLockedMatch(tx, match, now);
      return { status: "confirmed", closed: plan.closesMatch };
    }

    // Waitlist: append at the end.
    const [last] = await tx
      .select({ max: sql<number>`coalesce(max(${matchSignups.positionInQueue}), 0)` })
      .from(matchSignups)
      .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.status, "waitlist")));
    const position = Number(last?.max ?? 0) + 1;
    await tx
      .insert(matchSignups)
      .values({ matchId, userId, status: "waitlist", positionInQueue: position })
      .onConflictDoUpdate({
        target: [matchSignups.matchId, matchSignups.userId],
        set: { status: "waitlist", positionInQueue: position },
      });
    return { status: "waitlist", position };
  });
}

export type LeaveOutcome = { promotedUserId: string | null; keptDebt: boolean };

export async function leaveMatch(matchId: string, userId: string): Promise<LeaveOutcome> {
  return db.transaction(async (tx) => {
    const now = new Date();
    let match = await lockMatch(tx, matchId);
    if (isDueForClosing(match, now)) match = (await closeLockedMatch(tx, match, now)).match;

    const [mine] = await tx
      .select()
      .from(matchSignups)
      .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, userId)));
    const [first] = await tx
      .select({ userId: matchSignups.userId })
      .from(matchSignups)
      .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.status, "waitlist")))
      .orderBy(asc(matchSignups.positionInQueue))
      .limit(1);

    const plan = planWithdraw({
      match,
      now,
      mine: mine ? { status: mine.status, amountDueCents: mine.amountDueCents, paid: mine.paid } : null,
      firstInWaitlist: first?.userId ?? null,
      pricePerPlayerCents: match.pricePerPlayerCents,
    });

    if (plan.type === "error") {
      throw new ActionError(
        plan.reason === "frozen" ? "Este partido ya no admite cambios." : "No estás apuntado a este partido.",
      );
    }

    const shiftQueueAfter = async (position: number) => {
      await tx
        .update(matchSignups)
        .set({ positionInQueue: sql`${matchSignups.positionInQueue} - 1` })
        .where(
          and(
            eq(matchSignups.matchId, matchId),
            eq(matchSignups.status, "waitlist"),
            gt(matchSignups.positionInQueue, position),
          ),
        );
    };

    if (plan.type === "leave-waitlist") {
      await tx
        .update(matchSignups)
        .set({ status: "withdrawn", positionInQueue: null })
        .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, userId)));
      await shiftQueueAfter(mine!.positionInQueue ?? 0);
      return { promotedUserId: null, keptDebt: false };
    }

    await tx
      .update(matchSignups)
      .set({
        status: "withdrawn",
        positionInQueue: null,
        amountDueCents: plan.keepDebt ? mine!.amountDueCents : null,
      })
      .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, userId)));

    if (plan.promoteUserId) {
      await tx
        .update(matchSignups)
        .set({
          status: "confirmed",
          positionInQueue: null,
          amountDueCents: plan.promotedAmountDueCents,
          paid: false,
          paidAt: null,
        })
        .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, plan.promoteUserId)));
      await shiftQueueAfter(1);
    }
    return { promotedUserId: plan.promoteUserId, keptDebt: plan.keepDebt };
  });
}

export async function cancelMatch(matchId: string) {
  await db.transaction(async (tx) => {
    const match = await lockMatch(tx, matchId);
    if (match.status === "cancelled") return;
    if (match.status === "played") throw new ActionError("No se puede cancelar un partido ya jugado.");
    await tx.update(matches).set({ status: "cancelled" }).where(eq(matches.id, matchId));
    // Unpaid shares disappear; paid ones stay on record (to refund outside the app).
    await tx
      .update(matchSignups)
      .set({ amountDueCents: null })
      .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.paid, false)));
  });
}

export async function setPaid(matchId: string, userId: string, paid: boolean) {
  const [row] = await db
    .update(matchSignups)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(
      and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, userId), isNotNull(matchSignups.amountDueCents)),
    )
    .returning({ amount: matchSignups.amountDueCents });
  if (!row) throw new ActionError("Ese jugador no tiene nada que pagar en este partido.");
  return { amount: formatEuros(row.amount!) };
}
