import { describe, expect, it } from "vitest";
import { computeLevelChanges, expectedScore, goalDifferenceMultiplier, isProvisional } from "./elo";

const p = (userId: string, rating: number, provisional = false) => ({ userId, rating, provisional });

describe("Elo by teams (PRD §5.5)", () => {
  it("expects 50% between equal teams and favours the stronger one", () => {
    expect(expectedScore(6, 6)).toBe(0.5);
    expect(expectedScore(7, 5)).toBeCloseTo(1 / (1 + 10 ** -0.5), 10); // ≈ 0.76
    expect(expectedScore(5, 7)).toBeCloseTo(1 - expectedScore(7, 5), 10);
  });

  it("scales with the goal difference", () => {
    expect(goalDifferenceMultiplier(3, 3)).toBe(1);
    expect(goalDifferenceMultiplier(5, 3)).toBeCloseTo(1 + Math.log(3) / 3, 10);
  });

  it("moves equal teams by ±K·M·0.5 after a 1-goal win", () => {
    const changes = computeLevelChanges({
      teamA: [p("a1", 6), p("a2", 6)],
      teamB: [p("b1", 6), p("b2", 6)],
      scoreA: 4,
      scoreB: 3,
    });
    const m = 1 + Math.log(2) / 3;
    const expected = Math.round(0.3 * m * 0.5 * 100) / 100; // 0.18
    expect(changes.find((c) => c.userId === "a1")).toMatchObject({ team: "A", before: 6, delta: expected });
    expect(changes.find((c) => c.userId === "b1")).toMatchObject({ team: "B", delta: -expected });
  });

  it("doubles K for provisional players", () => {
    const [vet, rookie] = computeLevelChanges({
      teamA: [p("vet", 6), p("rookie", 6, true)],
      teamB: [p("b", 6)],
      scoreA: 2,
      scoreB: 1,
    });
    expect(rookie!.delta).toBeCloseTo(vet!.delta * 2, 1);
  });

  it("barely moves anyone when the favourite wins, punishes an upset", () => {
    const favouriteWins = computeLevelChanges({ teamA: [p("a", 8)], teamB: [p("b", 4)], scoreA: 1, scoreB: 0 });
    const upset = computeLevelChanges({ teamA: [p("a", 8)], teamB: [p("b", 4)], scoreA: 0, scoreB: 1 });
    expect(Math.abs(favouriteWins[0]!.delta)).toBeLessThan(0.05);
    expect(upset[0]!.delta).toBeLessThan(-0.3);
    expect(upset[1]!.delta).toBeGreaterThan(0.3);
  });

  it("gives draws a small nudge towards the underdog", () => {
    const [strong, weak] = computeLevelChanges({ teamA: [p("s", 7)], teamB: [p("w", 5)], scoreA: 2, scoreB: 2 });
    expect(strong!.delta).toBeLessThan(0);
    expect(weak!.delta).toBeGreaterThan(0);
  });

  it("averages uneven teams and keeps levels within 1–10", () => {
    const changes = computeLevelChanges({
      teamA: [p("top", 9.95, true)],
      teamB: [p("x", 3), p("y", 3), p("z", 3)],
      scoreA: 10,
      scoreB: 0,
    });
    expect(changes[0]!.after).toBeLessThanOrEqual(10);
    expect(changes).toHaveLength(4);
    const low = computeLevelChanges({ teamA: [p("low", 1.05, true)], teamB: [p("x", 1)], scoreA: 0, scoreB: 9 });
    expect(low[0]!.after).toBe(1);
  });

  it("returns nothing when a team is empty", () => {
    expect(computeLevelChanges({ teamA: [], teamB: [p("b", 5)], scoreA: 1, scoreB: 0 })).toEqual([]);
  });

  it("stays provisional until 5 matches", () => {
    expect(isProvisional(4)).toBe(true);
    expect(isProvisional(5)).toBe(false);
  });
});
