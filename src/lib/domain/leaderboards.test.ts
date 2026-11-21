import { describe, expect, it } from "vitest";
import { buildBoards, unitLabel, type PlayerTotals } from "./leaderboards";

const base: Omit<PlayerTotals, "userId"> = {
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goals: 0,
  assists: 0,
  superGoals: 0,
  saves: 0,
  superSaves: 0,
  ownGoals: 0,
  keeperMatches: 0,
  goalsConceded: 0,
  ratedMatches: 0,
  averageRating: null,
  mvps: 0,
};
const player = (userId: string, extra: Partial<PlayerTotals>): PlayerTotals => ({ ...base, userId, ...extra });

const players = [
  player("alex", { matches: 5, goals: 7, assists: 2, superGoals: 2, ratedMatches: 4, averageRating: 7.4, mvps: 2 }),
  player("hugo", { matches: 4, goals: 7, assists: 1, ratedMatches: 2, averageRating: 9 }),
  player("dani", { matches: 6, keeperMatches: 6, goalsConceded: 9, saves: 30, superSaves: 5, ratedMatches: 6, averageRating: 6.8 }),
  player("marta", { matches: 3, keeperMatches: 3, goalsConceded: 3, superSaves: 1, ratedMatches: 3, averageRating: 6.5 }),
  player("lucia", { matches: 2, keeperMatches: 2, goalsConceded: 0, assists: 4 }),
];

const board = (key: string) => buildBoards(players).find((b) => b.key === key)!;

describe("leaderboards", () => {
  it("ranks the pichichi by goals, ties to fewer matches", () => {
    expect(board("goals").entries.map((e) => e.userId)).toEqual(["hugo", "alex"]);
  });

  it("leaves out players with zero", () => {
    expect(board("goals").entries).toHaveLength(2);
    expect(board("mvps").entries.map((e) => e.userId)).toEqual(["alex"]);
  });

  it("ranks goalkeepers by fewest goals conceded per match, with a minimum", () => {
    // Lucía conceded 0 but only played 2 matches in goal.
    expect(board("keeper").entries.map((e) => [e.userId, e.display])).toEqual([
      ["marta", "1,00"],
      ["dani", "1,50"],
    ]);
  });

  it("ranks the best average rating with a minimum of rated matches", () => {
    // Hugo has 9.0 but only 2 rated matches.
    expect(board("rating").entries.map((e) => [e.userId, e.display])).toEqual([
      ["alex", "7,4"],
      ["dani", "6,8"],
      ["marta", "6,5"],
    ]);
  });

  it("limits entries", () => {
    expect(buildBoards(players, 1).find((b) => b.key === "matches")!.entries).toEqual([
      { userId: "dani", value: 6, display: "6" },
    ]);
  });

  it("uses singular and plural units", () => {
    const goals = board("goals");
    expect(unitLabel(goals.unit, 1)).toBe("gol");
    expect(unitLabel(goals.unit, 7)).toBe("goles");
  });
});
