/**
 * Phase 2c: ratings as an extra signal for the level (PRD backlog: "MVP
 * como señal adicional para el nivel").
 *
 * Separate from the team Elo: once a match's 48 h rating window closes, each
 * player gets
 *
 *   bonus = 0.08 × (their average − the match average), capped at ±0.15
 *
 * - Only ratings from OTHER players count (self-ratings are ignored here).
 * - A player needs at least 3 such ratings; otherwise no bonus.
 * - The match average is the mean of the eligible players' averages, so at
 *   least 2 eligible players are needed to compare.
 */

import { roundRating } from "./level";

export const RATING_BONUS_FACTOR = 0.08;
export const RATING_BONUS_CAP = 0.15;
export const MIN_RATINGS_FOR_BONUS = 3;
export const RATING_WINDOW_HOURS = 48;

export type PlayerRatingsInput = {
  userId: string;
  /** Ratings received from other players (0–10), self-rating excluded. */
  ratings: number[];
};

export type RatingBonus = { userId: string; average: number; delta: number };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeRatingBonuses(players: PlayerRatingsInput[]): RatingBonus[] {
  const eligible = players
    .filter((p) => p.ratings.length >= MIN_RATINGS_FOR_BONUS)
    .map((p) => ({ userId: p.userId, average: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }));
  if (eligible.length < 2) return [];
  const matchAverage = eligible.reduce((a, p) => a + p.average, 0) / eligible.length;
  return eligible.map((p) => {
    const raw = RATING_BONUS_FACTOR * (p.average - matchAverage);
    const delta = round2(Math.max(-RATING_BONUS_CAP, Math.min(RATING_BONUS_CAP, raw)));
    return { userId: p.userId, average: roundRating(p.average), delta: delta === 0 ? 0 : delta };
  });
}

/** Ratings can be given until 48 h after the report was saved. */
export function ratingsDeadline(resultRecordedAt: Date): Date {
  return new Date(resultRecordedAt.getTime() + RATING_WINDOW_HOURS * 3_600_000);
}

export function areRatingsOpen(
  match: { status: string; resultRecordedAt: Date | null; ratingsClosedAt: Date | null },
  now: Date,
): boolean {
  return (
    match.status === "played" &&
    match.ratingsClosedAt == null &&
    match.resultRecordedAt != null &&
    now < ratingsDeadline(match.resultRecordedAt)
  );
}
