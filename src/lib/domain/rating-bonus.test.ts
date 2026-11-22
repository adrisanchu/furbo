import { describe, expect, it } from "vitest";
import { areRatingsOpen, computeRatingBonuses, ratingsDeadline } from "./rating-bonus";

describe("rating bonus (phase 2c)", () => {
  it("rewards players rated above the match average and penalises those below", () => {
    const bonuses = computeRatingBonuses([
      { userId: "star", ratings: [9, 9, 8.5, 9.5] }, // avg 9
      { userId: "ok", ratings: [7, 7, 7] }, // avg 7
      { userId: "meh", ratings: [5, 5, 5] }, // avg 5
    ]);
    // match average = 7
    expect(bonuses).toEqual([
      { userId: "star", average: 9, delta: 0.15 }, // 0.08 × 2 = 0.16 → capped
      { userId: "ok", average: 7, delta: 0 },
      { userId: "meh", average: 5, delta: -0.15 },
    ]);
  });

  it("scales small differences", () => {
    const [a, b] = computeRatingBonuses([
      { userId: "a", ratings: [8, 8, 8] },
      { userId: "b", ratings: [7, 7, 7] },
    ]);
    // match average 7.5 → ±0.08 × 0.5 = ±0.04
    expect(a!.delta).toBe(0.04);
    expect(b!.delta).toBe(-0.04);
  });

  it("needs 3 ratings per player and 2 eligible players", () => {
    expect(
      computeRatingBonuses([
        { userId: "a", ratings: [9, 9, 9] },
        { userId: "b", ratings: [3, 3] }, // only 2 ratings
      ]),
    ).toEqual([]);
    const bonuses = computeRatingBonuses([
      { userId: "a", ratings: [9, 9, 9] },
      { userId: "b", ratings: [5, 5, 5] },
      { userId: "c", ratings: [1] },
    ]);
    expect(bonuses.map((b) => b.userId)).toEqual(["a", "b"]);
  });

  it("keeps ratings open for 48 h after the report", () => {
    const recorded = new Date("2026-11-20T22:00:00Z");
    expect(ratingsDeadline(recorded).toISOString()).toBe("2026-11-22T22:00:00.000Z");
    const match = { status: "played", resultRecordedAt: recorded, ratingsClosedAt: null };
    expect(areRatingsOpen(match, new Date("2026-11-22T21:59:00Z"))).toBe(true);
    expect(areRatingsOpen(match, new Date("2026-11-22T22:00:00Z"))).toBe(false);
    expect(areRatingsOpen({ ...match, ratingsClosedAt: recorded }, recorded)).toBe(false);
    expect(areRatingsOpen({ ...match, status: "closed" }, recorded)).toBe(false);
  });
});
