"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { ratingHistory, selfAssessments, users } from "@/db/schema";
import { applyAdjustment, suggestRating } from "@/lib/domain/level";
import { requireUser } from "@/lib/session";
import { onboardingSchema, profileSchema, type OnboardingValues, type ProfileValues } from "@/lib/validation/profile";
import { ActionError, runAction } from "../action";

/** Saves the self-assessment (PRD §5.5): provisional level until 5 matches are played. */
export async function completeOnboarding(input: OnboardingValues) {
  return runAction(async () => {
    const user = await requireUser();
    const { preferredPosition, answers, adjustment } = onboardingSchema.parse(input);
    if ((user.matchesPlayed ?? 0) > 0) {
      throw new ActionError("Tu nivel ya se ajusta con tus partidos: no hace falta repetir la autoevaluación.");
    }
    const suggested = suggestRating(answers);
    const finalRating = applyAdjustment(suggested, adjustment);

    await db.transaction(async (tx) => {
      await tx.insert(selfAssessments).values({ userId: user.id, answers, suggestedRating: suggested, finalRating });
      await tx
        .update(users)
        .set({ rating: finalRating, ratingProvisional: true, preferredPosition })
        .where(eq(users.id, user.id));
      await tx.insert(ratingHistory).values({
        userId: user.id,
        matchId: null,
        ratingBefore: user.rating ?? null,
        ratingAfter: finalRating,
        delta: user.rating != null ? Math.round((finalRating - user.rating) * 100) / 100 : 0,
      });
    });
    return { rating: finalRating };
  });
}

export async function updateProfile(input: ProfileValues) {
  return runAction(async () => {
    const user = await requireUser();
    const values = profileSchema.parse(input);
    await db.update(users).set(values).where(eq(users.id, user.id));
    refresh();
    return null;
  });
}
