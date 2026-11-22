/**
 * Match report ("acta"): line-up and per-player stats, entered by admins.
 * Stats are counters per player per match, not an event log.
 *
 * - golazos (superGoals) are a subset of goals; paradones (superSaves) of saves.
 * - An own goal counts for the OTHER team.
 * - Inconsistencies (goals that don't add up to the score) are warnings, not
 *   errors: people forget who scored.
 */

export type Team = "A" | "B";

export type PlayerLine = {
  userId: string;
  team: Team;
  isGoalkeeper: boolean;
  goals: number;
  assists: number;
  saves: number;
  ownGoals: number;
  superGoals: number;
  superSaves: number;
};

export const STAT_KEYS = ["goals", "assists", "ownGoals", "saves", "superGoals", "superSaves"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABEL: Record<StatKey, string> = {
  goals: "Goles",
  assists: "Asistencias",
  ownGoals: "Goles en propia",
  saves: "Paradas",
  superGoals: "Golazos",
  superSaves: "Paradones",
};

export function emptyLine(userId: string, team: Team): PlayerLine {
  return { userId, team, isGoalkeeper: false, goals: 0, assists: 0, saves: 0, ownGoals: 0, superGoals: 0, superSaves: 0 };
}

const other = (team: Team): Team => (team === "A" ? "B" : "A");

/** Goals each team gets from the stats: its players' goals + the rival's own goals. */
export function goalsFromStats(players: PlayerLine[]): Record<Team, number> {
  const result: Record<Team, number> = { A: 0, B: 0 };
  for (const p of players) {
    result[p.team] += p.goals;
    result[other(p.team)] += p.ownGoals;
  }
  return result;
}

export function reportWarnings(players: PlayerLine[], score: { A: number; B: number } | null): string[] {
  const warnings: string[] = [];
  for (const team of ["A", "B"] as const) {
    const roster = players.filter((p) => p.team === team);
    if (roster.length && !roster.some((p) => p.isGoalkeeper)) warnings.push(`El equipo ${team} no tiene portero marcado.`);
  }
  if (!score) return warnings;
  const fromStats = goalsFromStats(players);
  for (const team of ["A", "B"] as const) {
    if (fromStats[team] !== score[team]) {
      warnings.push(
        `Equipo ${team}: el marcador dice ${score[team]} y los goles apuntados suman ${fromStats[team]}.`,
      );
    }
    const assists = players.filter((p) => p.team === team).reduce((sum, p) => sum + p.assists, 0);
    if (assists > score[team]) warnings.push(`Equipo ${team}: hay más asistencias (${assists}) que goles (${score[team]}).`);
  }
  return warnings;
}

/** "2 goles (1 golazo) · 1 asist. · 5 paradas (2 paradones)" — empty string when nothing. */
export function statSummary(p: Omit<PlayerLine, "userId" | "team" | "isGoalkeeper">): string {
  const parts: string[] = [];
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  if (p.goals) parts.push(n(p.goals, "gol", "goles") + (p.superGoals ? ` (${n(p.superGoals, "golazo", "golazos")})` : ""));
  if (p.assists) parts.push(n(p.assists, "asist.", "asist."));
  if (p.saves) parts.push(n(p.saves, "parada", "paradas") + (p.superSaves ? ` (${n(p.superSaves, "paradón", "paradones")})` : ""));
  if (p.ownGoals) parts.push(n(p.ownGoals, "en propia", "en propia"));
  return parts.join(" · ");
}
