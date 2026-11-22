"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { ratingHistory, selfAssessments, users } from "@/db/schema";
import { applyAdjustment, suggestRating } from "@/lib/domain/level";
import { canChangeNickname, nextNicknameChangeAt, nicknameError, normalizeNickname } from "@/lib/domain/nickname";
import { getSession, requireUser } from "@/lib/session";
import {
  identitySchema,
  onboardingSchema,
  profileSchema,
  type IdentityValues,
  type OnboardingValues,
  type ProfileValues,
} from "@/lib/validation/profile";
import { ActionError, runAction } from "../action";
import { isNicknameTaken } from "../nicknames";

const dayFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

/** Live check for the nickname fields (sign-up, onboarding, profile). */
export async function checkNickname(input: string) {
  return runAction(async () => {
    const nickname = normalizeNickname(String(input ?? ""));
    const error = nicknameError(nickname);
    if (error) return { available: false, nickname, message: error };
    const session = await getSession();
    const taken = await isNicknameTaken(nickname, session?.user.id);
    return { available: !taken, nickname, message: taken ? "Ese apodo ya está cogido" : null };
  });
}

/** Unique-index violation (two people grabbing the same nickname at once). */
function isUniqueViolation(err: unknown) {
  const cause = (err as { cause?: { code?: string } })?.cause ?? (err as { code?: string });
  return cause?.code === "23505";
}

/** Onboarding step for users without a nickname (magic-link sign-ups). */
export async function completeIdentity(input: IdentityValues) {
  return runAction(async () => {
    const user = await requireUser();
    const { firstName, lastName, nickname } = identitySchema.parse(input);
    if (user.nickname && user.nickname !== nickname) {
      throw new ActionError("Ya tienes apodo. Cámbialo desde tu perfil.");
    }
    if (await isNicknameTaken(nickname, user.id)) throw new ActionError("Ese apodo ya está cogido");
    try {
      await db
        .update(users)
        .set({ firstName, lastName, nickname, name: `${firstName} ${lastName}` })
        .where(eq(users.id, user.id));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ActionError("Ese apodo ya está cogido");
      throw err;
    }
    return { nickname };
  });
}

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
        source: "assessment",
      });
    });
    return { rating: finalRating };
  });
}

export async function updateProfile(input: ProfileValues) {
  return runAction(async () => {
    const user = await requireUser();
    const { firstName, lastName, nickname, preferredPosition } = profileSchema.parse(input);
    const update: Partial<typeof users.$inferInsert> = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      preferredPosition,
    };

    if (nickname !== user.nickname) {
      const changedAt = user.nicknameChangedAt ? new Date(user.nicknameChangedAt) : null;
      // The first nickname (from sign-up) can be fixed anytime; later, once every 30 days.
      if (user.nickname && !canChangeNickname(changedAt, new Date())) {
        throw new ActionError(`Podrás cambiar tu apodo de nuevo el ${dayFmt.format(nextNicknameChangeAt(changedAt)!)}.`);
      }
      if (await isNicknameTaken(nickname, user.id)) throw new ActionError("Ese apodo ya está cogido");
      update.nickname = nickname;
      update.nicknameChangedAt = new Date();
    }

    try {
      await db.update(users).set(update).where(eq(users.id, user.id));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ActionError("Ese apodo ya está cogido");
      throw err;
    }
    refresh();
    return null;
  });
}
