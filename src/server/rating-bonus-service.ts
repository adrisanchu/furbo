import "server-only";
import { and, asc, eq, inArray, isNotNull, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { matches, matchPlayers, playerRatings, ratingHistory, users } from "@/db/schema";
import { clampRating } from "@/lib/domain/level";
import { computeRatingBonuses, RATING_WINDOW_HOURS } from "@/lib/domain/rating-bonus";
import { lockMatch } from "./match-service";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Closes the ratings of a played match once its 48 h window is over and
 * applies the ratings bonus to the players' levels (phase 2c). Idempotent:
 * does nothing if the window is still open or was already closed.
 */
export async function applyRatingBonus(matchId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const match = await lockMatch(tx, matchId);
    if (match.status !== "played" || match.ratingsClosedAt || !match.resultRecordedAt) return null;
    if (now.getTime() < match.resultRecordedAt.getTime() + RATING_WINDOW_HOURS * 3_600_000) return null;

    const lineup = await tx.select({ userId: matchPlayers.userId }).from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
    const ids = lineup.map((p) => p.userId);
    // Self-ratings don't count for the level.
    const received = ids.length
      ? await tx
          .select({ ratedId: playerRatings.ratedId, scoreHalves: playerRatings.scoreHalves })
          .from(playerRatings)
          .where(
            and(
              eq(playerRatings.matchId, matchId),
              ne(playerRatings.raterId, playerRatings.ratedId),
              inArray(playerRatings.ratedId, ids),
            ),
          )
      : [];
    const bonuses = computeRatingBonuses(
      ids.map((userId) => ({
        userId,
        ratings: received.filter((r) => r.ratedId === userId).map((r) => r.scoreHalves / 2),
      })),
    ).filter((b) => b.delta !== 0);

    if (bonuses.length) {
      const locked = await tx
        .select()
        .from(users)
        .where(inArray(users.id, bonuses.map((b) => b.userId).sort()))
        .orderBy(asc(users.id))
        .for("update");
      for (const b of bonuses) {
        const u = locked.find((x) => x.id === b.userId);
        if (!u || u.rating == null) continue;
        const after = round2(clampRating(u.rating + b.delta));
        await tx.update(users).set({ rating: after }).where(eq(users.id, u.id));
        await tx.insert(ratingHistory).values({
          userId: u.id,
          matchId,
          ratingBefore: u.rating,
          ratingAfter: after,
          delta: round2(after - u.rating),
          source: "ratings",
        });
      }
    }
    await tx.update(matches).set({ ratingsClosedAt: now }).where(eq(matches.id, matchId));
    return { applied: bonuses.length };
  });
}

/** Closes every played match whose ratings window is over (lazily and from the cron). */
export async function closeDueRatings(now = new Date()) {
  const due = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.status, "played"),
        isNull(matches.ratingsClosedAt),
        isNotNull(matches.resultRecordedAt),
        lte(matches.resultRecordedAt, new Date(now.getTime() - RATING_WINDOW_HOURS * 3_600_000)),
      ),
    )
    .limit(100);
  let closed = 0;
  for (const { id } of due) {
    if (await applyRatingBonus(id, now)) closed++;
  }
  return { closed };
}
