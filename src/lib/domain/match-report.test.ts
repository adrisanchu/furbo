import { describe, expect, it } from "vitest";
import { emptyLine, goalsFromStats, reportWarnings, statSummary, type PlayerLine } from "./match-report";

const line = (userId: string, team: "A" | "B", extra: Partial<PlayerLine> = {}): PlayerLine => ({
  ...emptyLine(userId, team),
  ...extra,
});

describe("match report", () => {
  const players = [
    line("a1", "A", { isGoalkeeper: true, saves: 4 }),
    line("a2", "A", { goals: 2, assists: 1 }),
    line("b1", "B", { isGoalkeeper: true }),
    line("b2", "B", { goals: 1, ownGoals: 1 }),
  ];

  it("counts own goals for the other team", () => {
    expect(goalsFromStats(players)).toEqual({ A: 3, B: 1 });
  });

  it("has no warnings when everything adds up", () => {
    expect(reportWarnings(players, { A: 3, B: 1 })).toEqual([]);
  });

  it("warns when goals don't match the score", () => {
    expect(reportWarnings(players, { A: 4, B: 1 })).toEqual([
      "Equipo A: el marcador dice 4 y los goles apuntados suman 3.",
    ]);
  });

  it("warns about missing goalkeepers and too many assists", () => {
    const noKeeper = [line("a1", "A", { goals: 1, assists: 2 }), line("b1", "B", { isGoalkeeper: true })];
    expect(reportWarnings(noKeeper, { A: 1, B: 0 })).toEqual([
      "El equipo A no tiene portero marcado.",
      "Equipo A: hay más asistencias (2) que goles (1).",
    ]);
  });

  it("only checks goalkeepers for a planned line-up (no score yet)", () => {
    expect(reportWarnings([line("a1", "A"), line("b1", "B", { isGoalkeeper: true })], null)).toEqual([
      "El equipo A no tiene portero marcado.",
    ]);
  });
});

describe("stat summary", () => {
  it("lists only non-zero stats, in Spanish", () => {
    expect(statSummary({ goals: 2, superGoals: 1, assists: 1, saves: 0, superSaves: 0, ownGoals: 0 })).toBe(
      "2 goles (1 golazo) · 1 asist.",
    );
    expect(statSummary({ goals: 0, superGoals: 0, assists: 0, saves: 1, superSaves: 1, ownGoals: 1 })).toBe(
      "1 parada (1 paradón) · 1 en propia",
    );
    expect(statSummary({ goals: 0, superGoals: 0, assists: 0, saves: 0, superSaves: 0, ownGoals: 0 })).toBe("");
  });
});
