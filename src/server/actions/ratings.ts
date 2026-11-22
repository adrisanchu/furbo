"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { matches, matchPlayers, playerRatings } from "@/db/schema";
import { areRatingsOpen } from "@/lib/domain/rating-bonus";
import { toHalves } from "@/lib/domain/ratings";
import { rateMatchSchema, type RateMatchInput } from "@/lib/validation/ratings";
import { ActionError, idSchema, runAction } from "../action";
import { requireMember } from "../authz";

/**
 * A member rates the players of a played match (0–10, half points). Saving
 * again overwrites their previous ratings; `null` removes one.
 */
export async function rateMatch(matchId: string, input: RateMatchInput) {
  return runAction(async () => {
    idSchema.parse(matchId);
    const [match] = await db
      .select({
        groupId: matches.groupId,
        status: matches.status,
        resultRecordedAt: matches.resultRecordedAt,
        ratingsClosedAt: matches.ratingsClosedAt,
      })
      .from(matches)
      .where(eq(matches.id, matchId));
    if (!match) throw new ActionError("Ese partido no existe.");
    const { user } = await requireMember(match.groupId);
    if (match.status !== "played") throw new ActionError("Se puede valorar cuando el partido tenga acta.");
    if (!areRatingsOpen(match, new Date())) {
      throw new ActionError("Las notas de este partido ya están cerradas (se puede valorar hasta 48 h después del acta).");
    }

    const { ratings } = rateMatchSchema.parse(input);
    const ids = ratings.map((r) => r.userId);
    const played = await db
      .select({ userId: matchPlayers.userId })
      .from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, matchId), inArray(matchPlayers.userId, ids)));
    if (played.length !== ids.length) throw new ActionError("Solo puedes valorar a quienes jugaron el partido.");

    const toSave = ratings.filter((r) => r.score != null);
    const toRemove = ratings.filter((r) => r.score == null).map((r) => r.userId);
    await db.transaction(async (tx) => {
      if (toRemove.length) {
        await tx
          .delete(playerRatings)
          .where(
            and(
              eq(playerRatings.matchId, matchId),
              eq(playerRatings.raterId, user.id),
              inArray(playerRatings.ratedId, toRemove),
            ),
          );
      }
      for (const r of toSave) {
        const scoreHalves = toHalves(r.score!);
        await tx
          .insert(playerRatings)
          .values({ matchId, raterId: user.id, ratedId: r.userId, scoreHalves })
          .onConflictDoUpdate({
            target: [playerRatings.matchId, playerRatings.raterId, playerRatings.ratedId],
            set: { scoreHalves, updatedAt: new Date() },
          });
      }
    });
    refresh();
    return { saved: toSave.length, removed: toRemove.length };
  });
}
