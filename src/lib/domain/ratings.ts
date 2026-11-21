/**
 * Player ratings after a match ("notas"): 0–10 in half-point steps.
 * Stored as an integer number of halves (0–20) to avoid float noise.
 *
 * For now anyone in the group can rate anyone who played, themselves
 * included; filtering (e.g. ignoring self-ratings) can come later. Ratings
 * don't affect the level yet (phase 2c).
 */

export const RATING_MIN = 0;
export const RATING_MAX = 10;
export const RATING_STEP = 0.5;

export function isValidRating(score: number): boolean {
  return Number.isFinite(score) && score >= RATING_MIN && score <= RATING_MAX && Number.isInteger(score * 2);
}

export function toHalves(score: number): number {
  return Math.round(score * 2);
}

export function fromHalves(halves: number): number {
  return halves / 2;
}

/** "7,5" — one decimal, Spanish comma. */
export function formatRating(score: number | null | undefined): string {
  return score == null ? "–" : score.toFixed(1).replace(".", ",");
}

export type RatedPlayer = {
  userId: string;
  /** Average rating received in the match (null if nobody rated them). */
  average: number | null;
  count: number;
  goals: number;
  assists: number;
};

/**
 * MVP of a match: best average rating; ties go to more ratings, then more
 * goals + assists. Null until somebody has been rated.
 */
export function pickMvp(players: RatedPlayer[]): string | null {
  const rated = players.filter((p) => p.average != null && p.count > 0);
  if (!rated.length) return null;
  rated.sort(
    (a, b) =>
      b.average! - a.average! ||
      b.count - a.count ||
      b.goals + b.assists - (a.goals + a.assists) ||
      a.userId.localeCompare(b.userId),
  );
  return rated[0]!.userId;
}
