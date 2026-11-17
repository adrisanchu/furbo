import { z } from "zod";
import { parseEurosToCents } from "@/lib/domain/money";
import { zonedLocalToUtc } from "@/lib/domain/time";

const localDateTime = z
  .string()
  .refine((v) => zonedLocalToUtc(v) !== null, { message: "Elige fecha y hora" });

const intInRange = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, { message });

/** Match form (PRD §5.4). Dates are Madrid wall time from datetime-local inputs. */
export const matchFormSchema = z
  .object({
    startsAt: localDateTime,
    durationMin: intInRange(30, 240, "Entre 30 y 240 minutos"),
    locationLabel: z.string().trim().max(160, "Máximo 160 caracteres"),
    format: z.enum(["f5", "f7", "f11"]),
    maxPlayers: intInRange(2, 30, "Entre 2 y 30 jugadores"),
    minPlayers: intInRange(2, 30, "Entre 2 y 30 jugadores"),
    courtPrice: z
      .string()
      .trim()
      .refine((v) => parseEurosToCents(v) !== null, { message: "Precio no válido (p. ej. 50 o 49,50)" }),
    signupDeadline: localDateTime,
  })
  .refine((v) => Number(v.minPlayers) <= Number(v.maxPlayers), {
    message: "El mínimo no puede superar las plazas",
    path: ["minPlayers"],
  })
  .refine(
    (v) => {
      const start = zonedLocalToUtc(v.startsAt);
      const deadline = zonedLocalToUtc(v.signupDeadline);
      return !start || !deadline || deadline <= start;
    },
    { message: "La inscripción debe cerrar antes de que empiece el partido", path: ["signupDeadline"] },
  );

export type MatchFormValues = z.infer<typeof matchFormSchema>;

export function toMatchValues(values: MatchFormValues) {
  return {
    startsAt: zonedLocalToUtc(values.startsAt)!,
    durationMin: Number(values.durationMin),
    locationLabel: values.locationLabel,
    format: values.format,
    maxPlayers: Number(values.maxPlayers),
    minPlayers: Number(values.minPlayers),
    courtPriceCents: parseEurosToCents(values.courtPrice)!,
    signupDeadline: zonedLocalToUtc(values.signupDeadline)!,
  };
}
