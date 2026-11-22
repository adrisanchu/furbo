/**
 * Group rankings from per-player totals (all played matches of a group, or a
 * date range: the query decides). Pure, so the rules are unit-tested.
 */

import { formatRating } from "./ratings";

export type PlayerTotals = {
  userId: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  superGoals: number;
  saves: number;
  superSaves: number;
  ownGoals: number;
  /** Matches played in goal, and goals conceded in them. */
  keeperMatches: number;
  goalsConceded: number;
  /** Matches in which they received at least one rating, and the average of all ratings received. */
  ratedMatches: number;
  averageRating: number | null;
  mvps: number;
};

/** Minimum matches for ratio-based rankings (best goalkeeper, best rating). */
export const MIN_MATCHES_FOR_AVERAGES = 3;

export type Unit = { one: string; many: string };

export type BoardKey = "goals" | "assists" | "superGoals" | "keeper" | "superSaves" | "mvps" | "rating" | "matches";

export type Board = {
  key: BoardKey;
  title: string;
  /** What the number means, singular and plural ("gol" / "goles"). */
  unit: Unit;
  description: string;
  entries: { userId: string; value: number; display: string }[];
};

const BOARDS: {
  key: BoardKey;
  title: string;
  unit: Unit;
  description: string;
  value: (p: PlayerTotals) => number | null;
  ascending?: boolean;
  display?: (v: number) => string;
}[] = [
  { key: "goals", title: "Pichichi", unit: { one: "gol", many: "goles" }, description: "Máximo goleador", value: (p) => p.goals || null },
  { key: "assists", title: "Asistencias", unit: { one: "asist.", many: "asist." }, description: "El que más goles regala", value: (p) => p.assists || null },
  { key: "superGoals", title: "Golazos", unit: { one: "golazo", many: "golazos" }, description: "Goles de los que se hablan", value: (p) => p.superGoals || null },
  {
    key: "keeper",
    title: "Zamora",
    unit: { one: "por partido", many: "por partido" },
    description: `Portero menos goleado (mín. ${MIN_MATCHES_FOR_AVERAGES} partidos en portería)`,
    value: (p) => (p.keeperMatches >= MIN_MATCHES_FOR_AVERAGES ? p.goalsConceded / p.keeperMatches : null),
    ascending: true,
    display: (v) => v.toFixed(2).replace(".", ","),
  },
  { key: "superSaves", title: "Paradones", unit: { one: "paradón", many: "paradones" }, description: "Las paradas imposibles", value: (p) => p.superSaves || null },
  { key: "mvps", title: "MVP", unit: { one: "MVP", many: "MVP" }, description: "Mejor nota del partido", value: (p) => p.mvps || null },
  {
    key: "rating",
    title: "Mejor nota media",
    unit: { one: "de media", many: "de media" },
    description: `Media de las notas recibidas (mín. ${MIN_MATCHES_FOR_AVERAGES} partidos valorados)`,
    value: (p) => (p.ratedMatches >= MIN_MATCHES_FOR_AVERAGES ? p.averageRating : null),
    display: (v) => formatRating(Math.round(v * 10) / 10),
  },
  { key: "matches", title: "Fijos", unit: { one: "partido", many: "partidos" }, description: "Los que nunca fallan", value: (p) => p.matches || null },
];

export function buildBoards(players: PlayerTotals[], limit = 5): Board[] {
  return BOARDS.map((b) => {
    const entries = players
      .map((p) => ({ p, value: b.value(p) }))
      .filter((e): e is { p: PlayerTotals; value: number } => e.value != null)
      .sort(
        (x, y) =>
          (b.ascending ? x.value - y.value : y.value - x.value) ||
          // Ties: whoever needed fewer matches ranks higher.
          x.p.matches - y.p.matches ||
          x.p.userId.localeCompare(y.p.userId),
      )
      .slice(0, limit)
      .map(({ p, value }) => ({ userId: p.userId, value, display: b.display ? b.display(value) : String(value) }));
    return { key: b.key, title: b.title, unit: b.unit, description: b.description, entries };
  });
}

/** "1 gol" / "2 goles" (ratios and averages always use the plural form). */
export function unitLabel(unit: Unit, value: number): string {
  return value === 1 ? unit.one : unit.many;
}
