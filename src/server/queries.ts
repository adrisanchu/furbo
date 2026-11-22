import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  groupInvites,
  groupMembers,
  groups,
  matches,
  matchPlayers,
  matchSignups,
  playerRatings,
  ratingHistory,
  users,
} from "@/db/schema";
import type { PlayerTotals } from "@/lib/domain/leaderboards";

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
      select 1 from match_players mp join matches m on m.id = mp.match_id
      where mp.user_id = u.id and m.group_id = ${groups.id}
        and m.status = 'played' and m.starts_at > now() - interval '6 months'
    )
), ${groups.referenceRating})`;

const groupCard = {
  id: groups.id,
  ownerId: groups.ownerId,
  name: groups.name,
  description: groups.description,
  visibility: groups.visibility,
  baseLabel: groups.baseLabel,
  defaultFormat: groups.defaultFormat,
  membersCount,
  level: groupLevel,
};

export type GroupCard = Awaited<ReturnType<typeof myGroups>>[number];

/** Groups a user owns, by visibility (for the plan quota). */
export async function ownedGroupCounts(userId: string) {
  const rows = await db
    .select({ visibility: groups.visibility, n: sql<number>`count(*)::int` })
    .from(groups)
    .where(eq(groups.ownerId, userId))
    .groupBy(groups.visibility);
  return {
    public: rows.find((r) => r.visibility === "public")?.n ?? 0,
    private: rows.find((r) => r.visibility === "private")?.n ?? 0,
  };
}

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
      ownerPlan: sql<"free" | "premium">`(select u.plan from users u where u.id = ${groups.ownerId})`,
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
      firstName: users.firstName,
      lastName: users.lastName,
      nickname: users.nickname,
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
  scoreA: matches.scoreA,
  scoreB: matches.scoreB,
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
      resultRecordedAt: matches.resultRecordedAt,
      ratingsClosedAt: matches.ratingsClosedAt,
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
      firstName: users.firstName,
      lastName: users.lastName,
      nickname: users.nickname,
      rating: users.rating,
      ratingProvisional: users.ratingProvisional,
      preferredPosition: users.preferredPosition,
      status: matchSignups.status,
      positionInQueue: matchSignups.positionInQueue,
      amountDueCents: matchSignups.amountDueCents,
      paid: matchSignups.paid,
      addedInReport: matchSignups.addedInReport,
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

/**
 * Line-up and stats of a match, with each player's level change: the result
 * (Elo) and, once ratings closed, the ratings bonus (phase 2c).
 */
export async function matchLineup(matchId: string) {
  const historyOf = (source: "match_result" | "ratings", column: "delta" | "rating_before") =>
    sql<number | null>`(
      select h.${sql.raw(column)} from rating_history h
      where h.match_id = ${matchPlayers.matchId} and h.user_id = ${matchPlayers.userId} and h.source = ${source}
      limit 1
    )`;
  return db
    .select({
      userId: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      nickname: users.nickname,
      team: matchPlayers.team,
      isGoalkeeper: matchPlayers.isGoalkeeper,
      goals: matchPlayers.goals,
      assists: matchPlayers.assists,
      saves: matchPlayers.saves,
      ownGoals: matchPlayers.ownGoals,
      superGoals: matchPlayers.superGoals,
      superSaves: matchPlayers.superSaves,
      ratingBefore: historyOf("match_result", "rating_before"),
      delta: historyOf("match_result", "delta"),
      ratingBonus: historyOf("ratings", "delta"),
      currentRating: users.rating,
    })
    .from(matchPlayers)
    .innerJoin(users, eq(users.id, matchPlayers.userId))
    .where(eq(matchPlayers.matchId, matchId))
    .orderBy(asc(matchPlayers.team), desc(matchPlayers.isGoalkeeper), asc(users.name));
}

/**
 * People an admin can put in the line-up: active members, plus anyone already
 * in it (e.g. someone who left the group after the match). Confirmed sign-ups
 * first.
 */
export async function reportCandidates(matchId: string, groupId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      nickname: users.nickname,
      rating: users.rating,
      signupStatus: matchSignups.status,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .leftJoin(matchSignups, and(eq(matchSignups.matchId, matchId), eq(matchSignups.userId, users.id)))
    .leftJoin(matchPlayers, and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, users.id)))
    .where(and(eq(groupMembers.groupId, groupId), or(eq(groupMembers.status, "active"), isNotNull(matchPlayers.userId))))
    .orderBy(sql`(${matchSignups.status} = 'confirmed') desc nulls last`, asc(users.name));
}

/** Matches that started in the admin's groups and still have no result. */
export async function pendingReportsForAdmin(userId: string) {
  return db
    .select({ id: matches.id, groupName: groups.name, startsAt: matches.startsAt })
    .from(matches)
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, matches.groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.status, "active"),
        eq(groupMembers.role, "admin"),
      ),
    )
    .where(and(inArray(matches.status, ["open", "closed"]), sql`${matches.startsAt} <= now()`))
    .orderBy(desc(matches.startsAt))
    .limit(5);
}

/** A player's level over time: the self-assessment, then one point per match. */
export async function levelHistory(userId: string) {
  return db
    .select({
      id: ratingHistory.id,
      at: sql<Date>`coalesce(${matches.startsAt}, ${ratingHistory.createdAt})`.mapWith((v) => new Date(v)),
      matchId: ratingHistory.matchId,
      groupName: groups.name,
      ratingAfter: ratingHistory.ratingAfter,
      delta: ratingHistory.delta,
      source: ratingHistory.source,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
      team: matchPlayers.team,
    })
    .from(ratingHistory)
    .leftJoin(matches, eq(matches.id, ratingHistory.matchId))
    .leftJoin(groups, eq(groups.id, matches.groupId))
    .leftJoin(matchPlayers, and(eq(matchPlayers.matchId, ratingHistory.matchId), eq(matchPlayers.userId, ratingHistory.userId)))
    .where(eq(ratingHistory.userId, userId))
    .orderBy(asc(sql`coalesce(${matches.startsAt}, ${ratingHistory.createdAt})`), asc(ratingHistory.createdAt));
}

/** Average and count of the ratings each player got in a match, plus the viewer's own ratings. */
export async function matchRatings(matchId: string, viewerId: string) {
  const [summary, mine] = await Promise.all([
    db
      .select({
        userId: playerRatings.ratedId,
        average: sql<number>`avg(${playerRatings.scoreHalves})::float8 / 2`,
        count: sql<number>`count(*)::int`,
      })
      .from(playerRatings)
      .where(eq(playerRatings.matchId, matchId))
      .groupBy(playerRatings.ratedId),
    db
      .select({ userId: playerRatings.ratedId, scoreHalves: playerRatings.scoreHalves })
      .from(playerRatings)
      .where(and(eq(playerRatings.matchId, matchId), eq(playerRatings.raterId, viewerId))),
  ]);
  return {
    summary: new Map(summary.map((r) => [r.userId, { average: r.average, count: r.count }])),
    mine: new Map(mine.map((r) => [r.userId, r.scoreHalves / 2])),
  };
}

/**
 * Per-player totals over played matches, filtered by group and/or player and
 * an optional date range (seasons are just a date filter). MVP per match:
 * best average rating, then more ratings, then goals + assists (same rules as
 * `pickMvp`).
 */
export async function playerTotals(filter: { groupId?: string; userId?: string; from?: Date; to?: Date }) {
  const group = filter.groupId ? sql`and m.group_id = ${filter.groupId}` : sql``;
  const user = filter.userId ? sql`and mp.user_id = ${filter.userId}` : sql``;
  const from = filter.from ? sql`and m.starts_at >= ${filter.from}` : sql``;
  const to = filter.to ? sql`and m.starts_at < ${filter.to}` : sql``;

  const result = await db.execute<{
    user_id: string;
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goals: number;
    assists: number;
    super_goals: number;
    saves: number;
    super_saves: number;
    own_goals: number;
    keeper_matches: number;
    goals_conceded: number;
    rated_matches: number;
    average_rating: number | null;
    mvps: number;
  }>(sql`
    with played as (
      select mp.*, m.score_a, m.score_b
      from match_players mp join matches m on m.id = mp.match_id
      where m.status = 'played' ${group} ${user} ${from} ${to}
    ),
    rated as (
      select pr.match_id, pr.rated_id, avg(pr.score_halves) / 2.0 as average,
             count(*) as n, sum(pr.score_halves) as halves
      from player_ratings pr join matches m on m.id = pr.match_id
      where m.status = 'played' ${group} ${from} ${to}
      group by pr.match_id, pr.rated_id
    ),
    mvp as (
      select distinct on (r.match_id) r.match_id, r.rated_id
      from rated r join match_players x on x.match_id = r.match_id and x.user_id = r.rated_id
      order by r.match_id, r.average desc, r.n desc, (x.goals + x.assists) desc, r.rated_id
    )
    select p.user_id,
      count(*)::int as matches,
      count(*) filter (where (p.team = 'A' and p.score_a > p.score_b) or (p.team = 'B' and p.score_b > p.score_a))::int as wins,
      count(*) filter (where p.score_a = p.score_b)::int as draws,
      count(*) filter (where (p.team = 'A' and p.score_a < p.score_b) or (p.team = 'B' and p.score_b < p.score_a))::int as losses,
      sum(p.goals)::int as goals,
      sum(p.assists)::int as assists,
      sum(p.super_goals)::int as super_goals,
      sum(p.saves)::int as saves,
      sum(p.super_saves)::int as super_saves,
      sum(p.own_goals)::int as own_goals,
      count(*) filter (where p.is_goalkeeper)::int as keeper_matches,
      coalesce(sum(case when p.is_goalkeeper then case when p.team = 'A' then p.score_b else p.score_a end end), 0)::int as goals_conceded,
      count(r.match_id)::int as rated_matches,
      (sum(r.halves)::float8 / nullif(sum(r.n), 0) / 2) as average_rating,
      count(v.match_id)::int as mvps
    from played p
    left join rated r on r.match_id = p.match_id and r.rated_id = p.user_id
    left join mvp v on v.match_id = p.match_id and v.rated_id = p.user_id
    group by p.user_id
  `);

  return result.rows.map(
    (r): PlayerTotals => ({
      userId: r.user_id,
      matches: r.matches,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      goals: r.goals,
      assists: r.assists,
      superGoals: r.super_goals,
      saves: r.saves,
      superSaves: r.super_saves,
      ownGoals: r.own_goals,
      keeperMatches: r.keeper_matches,
      goalsConceded: r.goals_conceded,
      ratedMatches: r.rated_matches,
      averageRating: r.average_rating,
      mvps: r.mvps,
    }),
  );
}

/** Names for a set of users (for leaderboards). */
export async function usersByIds(ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({ userId: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName, nickname: users.nickname })
    .from(users)
    .where(inArray(users.id, ids));
}

/** Played matches with ratings still open (48 h) that the user played in and hasn't rated yet. */
export async function matchesToRate(userId: string) {
  return db
    .select({ id: matches.id, groupName: groups.name, startsAt: matches.startsAt })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .innerJoin(groups, eq(groups.id, matches.groupId))
    .where(
      and(
        eq(matchPlayers.userId, userId),
        eq(matches.status, "played"),
        isNull(matches.ratingsClosedAt),
        sql`${matches.resultRecordedAt} > now() - interval '48 hours'`,
        sql`not exists (select 1 from player_ratings pr where pr.match_id = ${matches.id} and pr.rater_id = ${userId})`,
      ),
    )
    .orderBy(desc(matches.startsAt))
    .limit(3);
}
