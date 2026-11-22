import { describe, expect, it } from "vitest";
import { formatRating, fromHalves, isValidRating, pickMvp, toHalves } from "./ratings";

describe("ratings", () => {
  it.each([0, 0.5, 5, 7.5, 10])("accepts %s", (s) => expect(isValidRating(s)).toBe(true));
  it.each([-0.5, 10.5, 7.3, Number.NaN])("rejects %s", (s) => expect(isValidRating(s)).toBe(false));

  it("stores halves", () => {
    expect(toHalves(7.5)).toBe(15);
    expect(fromHalves(15)).toBe(7.5);
    expect(toHalves(0)).toBe(0);
  });

  it("formats with a Spanish comma", () => {
    expect(formatRating(7.5)).toBe("7,5");
    expect(formatRating(8)).toBe("8,0");
    expect(formatRating(null)).toBe("–");
  });
});

describe("MVP", () => {
  const p = (userId: string, average: number | null, count: number, goals = 0, assists = 0) => ({
    userId,
    average,
    count,
    goals,
    assists,
  });

  it("is the best average", () => {
    expect(pickMvp([p("a", 7, 3), p("b", 8.5, 2), p("c", 6, 5)])).toBe("b");
  });

  it("breaks ties by number of ratings, then goals + assists", () => {
    expect(pickMvp([p("a", 8, 2), p("b", 8, 4)])).toBe("b");
    expect(pickMvp([p("a", 8, 3, 1), p("b", 8, 3, 2, 1)])).toBe("b");
  });

  it("is nobody until someone is rated", () => {
    expect(pickMvp([p("a", null, 0), p("b", null, 0)])).toBeNull();
    expect(pickMvp([])).toBeNull();
  });
});
