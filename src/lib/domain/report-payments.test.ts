import { describe, expect, it } from "vitest";
import { planReportPayments, type SignupForPayments } from "./report-payments";

const s = (userId: string, status: SignupForPayments["status"], extra: Partial<SignupForPayments> = {}): SignupForPayments => ({
  userId,
  status,
  amountDueCents: status === "confirmed" ? 500 : null,
  addedInReport: false,
  ...extra,
});

describe("payments when the report adds players", () => {
  const signups = [s("a", "confirmed"), s("b", "confirmed"), s("c", "confirmed"), s("d", "confirmed")];

  it("changes nothing when the line-up only has signed-up players", () => {
    const plan = planReportPayments({ signups, lineupIds: ["a", "b", "c"] });
    expect(plan).toEqual({ add: [], drop: [], payers: ["a", "b", "c", "d"], changed: false });
  });

  it("adds players who played without signing up and keeps no-shows paying", () => {
    // d didn't show up; x and y played without signing up.
    const plan = planReportPayments({ signups, lineupIds: ["a", "b", "c", "x", "y"] });
    expect(plan.add).toEqual(["x", "y"]);
    expect(plan.payers).toEqual(["a", "b", "c", "d", "x", "y"]);
    expect(plan.changed).toBe(true);
  });

  it("counts late withdrawers who still owe, unless they ended up playing", () => {
    const withDebt = [...signups, s("w", "withdrawn", { amountDueCents: 500 }), s("free", "withdrawn")];
    expect(planReportPayments({ signups: withDebt, lineupIds: ["a", "x"] }).payers).toEqual(["a", "b", "c", "d", "w", "x"]);
    // w played after all: re-added as a payer through the line-up, counted once.
    const plan = planReportPayments({ signups: withDebt, lineupIds: ["a", "w"] });
    expect(plan.add).toEqual(["w"]);
    expect(plan.payers).toEqual(["a", "b", "c", "d", "w"]);
  });

  it("treats waitlisted players in the line-up as additions", () => {
    const plan = planReportPayments({ signups: [...signups, s("q", "waitlist")], lineupIds: ["a", "q"] });
    expect(plan.add).toEqual(["q"]);
  });

  it("drops players added earlier when a correction removes them", () => {
    const corrected = [...signups, s("x", "confirmed", { addedInReport: true })];
    const plan = planReportPayments({ signups: corrected, lineupIds: ["a", "b"] });
    expect(plan.drop).toEqual(["x"]);
    expect(plan.payers).toEqual(["a", "b", "c", "d"]);
    expect(plan.changed).toBe(true);
  });

  it("keeps a previous addition stable when it's still in the line-up", () => {
    const corrected = [...signups, s("x", "confirmed", { addedInReport: true })];
    expect(planReportPayments({ signups: corrected, lineupIds: ["a", "x"] })).toMatchObject({ add: [], drop: [], changed: false });
  });
});
