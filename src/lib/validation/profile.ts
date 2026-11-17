import { z } from "zod";
import { isValidAnswers, MAX_ADJUSTMENT } from "@/lib/domain/level";

export const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward", "any"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABEL: Record<Position, string> = {
  goalkeeper: "Portero",
  defender: "Defensa",
  midfielder: "Medio",
  forward: "Delantero",
  any: "Indiferente",
};

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 letras").max(40, "Máximo 40 caracteres"),
  preferredPosition: z.enum(POSITIONS),
});

export const onboardingSchema = z.object({
  preferredPosition: z.enum(POSITIONS),
  answers: z.array(z.number().int()).refine(isValidAnswers, { message: "Responde a las 5 preguntas" }),
  adjustment: z.number().min(-MAX_ADJUSTMENT).max(MAX_ADJUSTMENT),
});

export type ProfileValues = z.infer<typeof profileSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;
