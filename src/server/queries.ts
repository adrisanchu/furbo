import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { groupInvites, groupMembers, groups, matches, matchSignups, users } from "@/db/schema";

/** Read-side queries. Authorization is the caller's job (pages check membership). */

const membersCount = sql<number>`(
  select count(*)::int from group_members gm
  where gm.group_id = ${groups.id} and gm.status = 'active'
)`;

/**
 * Group level (PRD §5.5): average level of active members who played a match
 * of this group in the last 6 months; the reference level otherwise.
 */
const groupLevel = sql<number>`coalesce((
  select avg(u.rating)::float8 from group_members gm
  join users u on u.id = gm.user_id
  where gm.group_id = ${groups.id} and gm.status = 'active' and u.rating is not null
    and exists (
      select 1 from match_signups s join matches m on m.id = s.match_id
      where s.user_id = u.id and s.status = 'confirmed' and m.group_id = ${groups.id}
        and m.status = 'played' and m.starts_at > now() - interval '6 months'
    )
), ${groups.referenceRating})`;

const groupCard = {
  id: groups.id,
  name: groups.name,
  description: groups.description,
  visibility: groups.visibility,
  baseLabel: groups.baseLabel,
  defaultFormat: groups.defaultFormat,
  membersCount,
  level: groupLevel,
};

export type GroupCard = Awaited<ReturnType<typeof myGroups>>[number];

export async function myGroups(userId: string) {
  return db
    .select({ ...groupCard, role: groupMembers.role })
    .from(groups)
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)))
    .where(eq(groupMembers.status, "active"))
    .orderBy(asc(groups.name));
}

export async function publicGroups(userId: string, query?: string) {
  const q = query?.trim();
  return db
    .select({
      ...groupCard,
      myStatus: sql<string | null>`(
        select gm.status from group_members gm where gm.group_id = ${groups.id} and gm.user_id = ${userId}
      )`,
    })
    .from(groups)
    .where(
      and(
        eq(groups.visibility, "public"),
        q ? or(ilike(groups.name, `%${q}%`), ilike(groups.baseLabel, `%${q}%`)) : undefined,
      ),
    )
    .orderBy(desc(membersCount), asc(groups.name))
    .limit(50);
}

export async function groupById(groupId: string) {
  const [group] = await db
    .select({
      ...groupCard,
      baseLocation: groups.baseLocation,
      referenceRating: groups.referenceRating,
      defaultCourtPriceCents: groups.defaultCourtPriceCents,
      whatsappUrl: groups.whatsappUrl,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .where(eq(groups.id, groupId));
  return group ?? null;
}

export async function groupMembersList(groupId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      rating: users.rating,
      ratingProvisional: users.ratingProvisional,
      preferredPosition: users.preferredPosition,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")))
    .orderBy(sql`${users.rating} desc nulls last`, asc(users.name));
}

export async function activeInvites(groupId: string) {
  return db
    .select()
    .from(groupInvites)
    .where(and(eq(groupInvites.groupId, groupId), isNull(groupInvites.revokedAt)))
    .orderBy(desc(groupInvites.createdAt));
}

export async function inviteByToken(token: string) {
  const [invite] = await db
    .select({ invite: groupInvites, group: { ...groupCard } })
    .from(groupInvites)
    .innerJoin(groups, eq(groups.id, groupInvites.groupId))
    .where(eq(groupInvites.token, token));
  return invite ?? null;
}

const confirmedCount = sql<number>`(
  select count(*)::int from match_signups s where s.match_id = ${matches.id} and s.status = 'confirmed'
)`;
const waitlistCount = sql<number>`(
  select count(*)::int from match_signups s where s.match_id = ${matches.id} and s.status = 'waitlist'
)`;

const matchCard = {
  id: matches.id,
  groupId: matches.groupId,
  groupName: groups.name,
  startsAt: matches.startsAt,
  durationMin: matches.durationMin,
  locationLabel: matches.locationLabel,
  format: matches.format,
  maxPlayers: matches.maxPlayers,
  minPlayers: matches.minPlayers,
  courtPriceCents: matches.courtPriceCents,
  pricePerPlayerCents: matches.pricePerPlayerCents,
  signupDeadline: matches.signupDeadline,
  status: matches.status,
  confirmedCount,
  waitlistCount,
};

export type MatchCard = Awaited<ReturnType<typeof upcomingMatchesForUser>>[number];

/** Upcoming (not cancelled) matches in the user's groups, with their own sign-up status. */
export async function upcomingMatchesForUser(userId: string, opts: { groupId?: string; limit?: number } = {}) {
  return db
    .select({ ...matchCard, myStatus: matchSignups.status, myAmountDueCents: matchSignups.amountDueCents })
    .from(matches)
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .innerJoin(
      groupMembers,
      and(eq(groupMembers.groupId, matches.groupId), eq(groupMembers.userId, userId), eq(groupMembers.status, "active")),
    )
    .leftJoin(matchSignups, and(eq(matchSignups.matchId, matches.id), eq(matchSignups.userId, userId)))
    .where(
      and(
        inArray(matches.status, ["open", "closed"]),
        gt(matches.startsAt, sql`now() - interval '2 hours'`),
        opts.groupId ? eq(matches.groupId, opts.groupId) : undefined,
      ),
    )
    .orderBy(asc(matches.startsAt))
    .limit(opts.limit ?? 50);
}

/** Past or cancelled matches of a group (most recent first). */
export async function pastMatchesForGroup(groupId: string, limit = 10) {
  return db
    .select(matchCard)
    .from(matches)
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .where(
      and(
        eq(matches.groupId, groupId),
        or(inArray(matches.status, ["played", "cancelled"]), sql`${matches.startsAt} <= now() - interval '2 hours'`),
      ),
    )
    .orderBy(desc(matches.startsAt))
    .limit(limit);
}

export async function matchById(matchId: string) {
  const [match] = await db
    .select({
      ...matchCard,
      location: matches.location,
      belowMinimumAt: matches.belowMinimumAt,
      closedAt: matches.closedAt,
      createdBy: matches.createdBy,
      groupBaseLabel: groups.baseLabel,
    })
    .from(matches)
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .where(eq(matches.id, matchId));
  return match ?? null;
}

export async function matchSignupsList(matchId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      rating: users.rating,
      ratingProvisional: users.ratingProvisional,
      preferredPosition: users.preferredPosition,
      status: matchSignups.status,
      positionInQueue: matchSignups.positionInQueue,
      amountDueCents: matchSignups.amountDueCents,
      paid: matchSignups.paid,
      createdAt: matchSignups.createdAt,
      updatedAt: matchSignups.updatedAt,
    })
    .from(matchSignups)
    .innerJoin(users, eq(users.id, matchSignups.userId))
    .where(eq(matchSignups.matchId, matchId))
    .orderBy(asc(matchSignups.positionInQueue), asc(matchSignups.createdAt));
}

/** Unpaid fixed amounts owed by a user, per match (closed or played matches). */
export async function pendingPaymentsForUser(userId: string) {
  return db
    .select({
      matchId: matches.id,
      groupId: groups.id,
      groupName: groups.name,
      startsAt: matches.startsAt,
      amountDueCents: matchSignups.amountDueCents,
    })
    .from(matchSignups)
    .innerJoin(matches, eq(matches.id, matchSignups.matchId))
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .where(
      and(
        eq(matchSignups.userId, userId),
        eq(matchSignups.paid, false),
        isNotNull(matchSignups.amountDueCents),
        sql`${matchSignups.amountDueCents} > 0`,
        inArray(matches.status, ["closed", "played"]),
      ),
    )
    .orderBy(asc(matches.startsAt));
}

/** Per-player unpaid totals in a group, plus the rounding pot (PRD §5.6). */
export async function groupBalances(groupId: string) {
  const debts = await db
    .select({
      userId: users.id,
      name: users.name,
      owedCents: sql<number>`sum(${matchSignups.amountDueCents})::int`,
      matchesCount: sql<number>`count(*)::int`,
    })
    .from(matchSignups)
    .innerJoin(matches, eq(matches.id, matchSignups.matchId))
    .innerJoin(users, eq(users.id, matchSignups.userId))
    .where(
      and(
        eq(matches.groupId, groupId),
        inArray(matches.status, ["closed", "played"]),
        eq(matchSignups.paid, false),
        isNotNull(matchSignups.amountDueCents),
        sql`${matchSignups.amountDueCents} > 0`,
      ),
    )
    .groupBy(users.id, users.name)
    .orderBy(desc(sql`sum(${matchSignups.amountDueCents})`));

  const [pot] = await db
    .select({
      cents: sql<number>`coalesce(sum(
        (select coalesce(sum(s.amount_due_cents), 0) from match_signups s where s.match_id = ${matches.id})
        - ${matches.courtPriceCents}
      ), 0)::int`,
    })
    .from(matches)
    .where(
      and(
        eq(matches.groupId, groupId),
        inArray(matches.status, ["closed", "played"]),
        gt(matches.pricePerPlayerCents, 0),
      ),
    );

  return { debts, potCents: Math.max(0, pot?.cents ?? 0) };
}
