import { z } from "zod";
import { isValidRating } from "@/lib/domain/ratings";

/** Ratings a member gives after a match. `score: null` removes their rating for that player. */
export const rateMatchSchema = z.object({
  ratings: z
    .array(
      z.object({
        userId: z.uuid(),
        score: z
          .number()
          .refine(isValidRating, { message: "La nota va de 0 a 10, de medio en medio punto" })
          .nullable(),
      }),
    )
    .min(1)
    .max(60)
    .refine((r) => new Set(r.map((x) => x.userId)).size === r.length, { message: "Jugador repetido" }),
});

export type RateMatchInput = z.infer<typeof rateMatchSchema>;
