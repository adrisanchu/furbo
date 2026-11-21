import { z } from "zod";

const count = z.number().int().min(0, "No puede ser negativo").max(30, "Máximo 30");

export const playerLineSchema = z
  .object({
    userId: z.uuid(),
    team: z.enum(["A", "B"]),
    isGoalkeeper: z.boolean(),
    goals: count,
    assists: count,
    saves: count,
    ownGoals: count,
    superGoals: count,
    superSaves: count,
  })
  .refine((p) => p.superGoals <= p.goals, { message: "Los golazos no pueden superar a los goles", path: ["superGoals"] })
  .refine((p) => p.superSaves <= p.saves, {
    message: "Los paradones no pueden superar a las paradas",
    path: ["superSaves"],
  });

const score = z.number().int().min(0).max(99);

/**
 * The admin's match report. Without `result` it's a planned line-up (before
 * the match, no stats); with it, the final report that updates levels.
 */
export const matchReportSchema = z
  .object({
    players: z.array(playerLineSchema).max(60),
    result: z.object({ scoreA: score, scoreB: score }).nullable(),
  })
  .refine((r) => new Set(r.players.map((p) => p.userId)).size === r.players.length, {
    message: "Hay un jugador repetido en la alineación",
  })
  .refine((r) => !r.result || (r.players.some((p) => p.team === "A") && r.players.some((p) => p.team === "B")), {
    message: "Cada equipo necesita al menos un jugador",
  });

export type MatchReportInput = z.infer<typeof matchReportSchema>;
