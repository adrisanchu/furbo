import "server-only";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, matches, matchPlayers, playerRatings, ratingHistory, users } from "@/db/schema";
import { computeLevelChanges, isProvisional, type LevelChange } from "@/lib/domain/elo";
import { clampRating } from "@/lib/domain/level";
import type { MatchReportInput } from "@/lib/validation/report";
import { ActionError } from "./errors";
import { closeLockedMatch, lockMatch, type Tx } from "./match-service";

/** Fallback for a player without a level (shouldn't happen: onboarding sets it). */
const DEFAULT_RATING = 5;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Reverts every level change a match applied — the Elo of the result and, if
 * its ratings window had closed, the ratings bonus (for corrections). Only
 * this match's deltas are undone, even if the players have played since.
 */
async function revertLevelChanges(tx: Tx, matchId: string) {
  const previous = await tx.select().from(ratingHistory).where(eq(ratingHistory.matchId, matchId));
  if (!previous.length) return;
  // Per player: total delta to undo, and whether the match counted as played.
  const perUser = new Map<string, { delta: number; played: boolean }>();
  for (const h of previous) {
    const acc = perUser.get(h.userId) ?? { delta: 0, played: false };
    acc.delta += h.delta;
    if (h.source === "match_result") acc.played = true;
    perUser.set(h.userId, acc);
  }
  const ids = [...perUser.keys()].sort();
  const locked = await tx.select().from(users).where(inArray(users.id, ids)).orderBy(asc(users.id)).for("update");
  for (const u of locked) {
    const { delta, played } = perUser.get(u.id)!;
    const matchesPlayed = played ? Math.max(0, u.matchesPlayed - 1) : u.matchesPlayed;
    await tx
      .update(users)
      .set({
        rating: round2(clampRating((u.rating ?? DEFAULT_RATING) - delta)),
        matchesPlayed,
        ratingProvisional: isProvisional(matchesPlayed),
      })
      .where(eq(users.id, u.id));
  }
  await tx.delete(ratingHistory).where(eq(ratingHistory.matchId, matchId));
}

async function applyLevelChanges(tx: Tx, matchId: string, report: MatchReportInput & { result: NonNullable<MatchReportInput["result"]> }) {
  const ids = report.players.map((p) => p.userId).sort();
  const locked = await tx.select().from(users).where(inArray(users.id, ids)).orderBy(asc(users.id)).for("update");
  const byId = new Map(locked.map((u) => [u.id, u]));
  const side = (team: "A" | "B") =>
    report.players
      .filter((p) => p.team === team)
      .map((p) => {
        const u = byId.get(p.userId)!;
        return { userId: u.id, rating: u.rating ?? DEFAULT_RATING, provisional: u.ratingProvisional };
      });

  const changes = computeLevelChanges({
    teamA: side("A"),
    teamB: side("B"),
    scoreA: report.result.scoreA,
    scoreB: report.result.scoreB,
  });

  for (const c of changes) {
    const played = byId.get(c.userId)!.matchesPlayed + 1;
    await tx
      .update(users)
      .set({ rating: c.after, matchesPlayed: played, ratingProvisional: isProvisional(played) })
      .where(eq(users.id, c.userId));
  }
  if (changes.length) {
    await tx.insert(ratingHistory).values(
      changes.map((c) => ({
        userId: c.userId,
        matchId,
        ratingBefore: c.before,
        ratingAfter: c.after,
        delta: c.delta,
        source: "match_result" as const,
      })),
    );
  }
  return changes;
}

export type SaveReportOutcome = { played: boolean; corrected: boolean; changes: LevelChange[] };

/**
 * Saves the match report in one transaction (match row locked):
 * - without a result: the planned line-up (before or after kick-off), no stats;
 * - with a result: the final line-up and stats, the score, status → played,
 *   and the level update. Saving again corrects it: the previous level
 *   changes of this match are reverted and the new ones applied.
 */
export async function saveMatchReport(matchId: string, recordedBy: string, report: MatchReportInput): Promise<SaveReportOutcome> {
  return db.transaction(async (tx) => {
    const now = new Date();
    let match = await lockMatch(tx, matchId);
    if (match.status === "cancelled") throw new ActionError("El partido está cancelado.");
    if (report.result && now < match.startsAt) {
      throw new ActionError("El resultado se registra cuando haya empezado el partido. Ahora puedes guardar la alineación.");
    }
    if (!report.result && match.status === "played") {
      throw new ActionError("El partido ya tiene acta: para corregirla, incluye el resultado.");
    }

    // Everyone in the line-up must be (or have been) in the group.
    const ids = report.players.map((p) => p.userId);
    if (ids.length) {
      const known = await tx
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, match.groupId), inArray(groupMembers.userId, ids)));
      if (known.length !== new Set(ids).size) throw new ActionError("Hay jugadores en la alineación que no son del grupo.");
    }

    const corrected = match.status === "played";
    if (corrected) await revertLevelChanges(tx, matchId);

    // A match still open at kick-off closes first, so shares get fixed.
    if (report.result && match.status === "open") match = (await closeLockedMatch(tx, match, now)).match;

    await tx.delete(matchPlayers).where(eq(matchPlayers.matchId, matchId));
    // Ratings only make sense for people who played: drop those of anyone removed.
    await tx
      .delete(playerRatings)
      .where(
        and(
          eq(playerRatings.matchId, matchId),
          ids.length ? notInArray(playerRatings.ratedId, ids) : undefined,
        ),
      );
    if (report.players.length) {
      await tx.insert(matchPlayers).values(
        report.players.map((p) =>
          report.result
            ? { matchId, ...p }
            : // Planned line-up: no stats yet.
              { matchId, userId: p.userId, team: p.team, isGoalkeeper: p.isGoalkeeper },
        ),
      );
    }

    if (!report.result) return { played: false, corrected: false, changes: [] };

    const changes = await applyLevelChanges(tx, matchId, { ...report, result: report.result });
    await tx
      .update(matches)
      .set({
        status: "played",
        scoreA: report.result.scoreA,
        scoreB: report.result.scoreB,
        resultRecordedAt: now,
        resultRecordedBy: recordedBy,
        // A (re)saved report (re)opens the 48 h ratings window.
        ratingsClosedAt: null,
      })
      .where(eq(matches.id, matchId));
    return { played: true, corrected, changes };
  });
}
