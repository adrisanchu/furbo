import { z } from "zod";
import { isValidAnswers, MAX_ADJUSTMENT } from "@/lib/domain/level";
import { nicknameError, normalizeNickname } from "@/lib/domain/nickname";

export const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward", "any"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABEL: Record<Position, string> = {
  goalkeeper: "Portero",
  defender: "Defensa",
  midfielder: "Medio",
  forward: "Delantero",
  any: "Indiferente",
};

export const nicknameSchema = z
  .string()
  .transform(normalizeNickname)
  .superRefine((value, ctx) => {
    const error = nicknameError(value);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });

/** Identity asked at sign-up (or in the onboarding for magic-link users). */
export const identitySchema = z.object({
  firstName: z.string().trim().min(2, "Mínimo 2 letras").max(40, "Máximo 40 caracteres"),
  lastName: z.string().trim().min(2, "Mínimo 2 letras").max(60, "Máximo 60 caracteres"),
  nickname: nicknameSchema,
});

export const profileSchema = identitySchema.extend({
  preferredPosition: z.enum(POSITIONS),
});

export type IdentityValues = z.input<typeof identitySchema>;

export const onboardingSchema = z.object({
  preferredPosition: z.enum(POSITIONS),
  answers: z.array(z.number().int()).refine(isValidAnswers, { message: "Responde a las 5 preguntas" }),
  adjustment: z.number().min(-MAX_ADJUSTMENT).max(MAX_ADJUSTMENT),
});

export type ProfileValues = z.input<typeof profileSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;
