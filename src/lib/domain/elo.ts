/**
 * Level update after a match (PRD §5.5): Elo by teams.
 *
 *   R_A, R_B = average level of each team
 *   E_A = 1 / (1 + 10^((R_B − R_A) / 4))
 *   S_A = 1 win, 0.5 draw, 0 loss
 *   M   = 1 + ln(1 + |goal difference|) / 3
 *   Δ   = K · M · (S − E),  K = 0.30 (0.60 while the level is provisional)
 *
 * Levels stay within 1.0–10.0. Uneven teams just use each team's average.
 */

import { clampRating, PROVISIONAL_MATCHES } from "./level";

export const K_DEFAULT = 0.3;
export const K_PROVISIONAL = 0.6;

export type EloPlayer = { userId: string; rating: number; provisional: boolean };

export type LevelChange = {
  userId: string;
  team: "A" | "B";
  before: number;
  after: number;
  /** after − before (already clamped), rounded to 2 decimals. */
  delta: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function teamAverage(players: { rating: number }[]): number {
  return players.length ? players.reduce((sum, p) => sum + p.rating, 0) / players.length : 0;
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 4));
}

export function goalDifferenceMultiplier(scoreA: number, scoreB: number): number {
  return 1 + Math.log(1 + Math.abs(scoreA - scoreB)) / 3;
}

export function actualScore(scoreA: number, scoreB: number): number {
  return scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
}

export function computeLevelChanges(input: {
  teamA: EloPlayer[];
  teamB: EloPlayer[];
  scoreA: number;
  scoreB: number;
}): LevelChange[] {
  const { teamA, teamB, scoreA, scoreB } = input;
  if (!teamA.length || !teamB.length) return [];
  const expectedA = expectedScore(teamAverage(teamA), teamAverage(teamB));
  const sA = actualScore(scoreA, scoreB);
  const m = goalDifferenceMultiplier(scoreA, scoreB);

  const change = (p: EloPlayer, team: "A" | "B", s: number, e: number): LevelChange => {
    const k = p.provisional ? K_PROVISIONAL : K_DEFAULT;
    const after = round2(clampRating(p.rating + k * m * (s - e)));
    return { userId: p.userId, team, before: p.rating, after, delta: round2(after - p.rating) };
  };

  return [
    ...teamA.map((p) => change(p, "A", sA, expectedA)),
    ...teamB.map((p) => change(p, "B", 1 - sA, 1 - expectedA)),
  ];
}

/** Provisional until PROVISIONAL_MATCHES matches have been played. */
export function isProvisional(matchesPlayed: number): boolean {
  return matchesPlayed < PROVISIONAL_MATCHES;
}
