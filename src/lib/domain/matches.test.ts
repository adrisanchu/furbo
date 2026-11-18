import { describe, expect, it } from "vitest";
import { isDueForClosing, planJoin, planWithdraw, priceIfJoining } from "./matches";

const now = new Date("2026-11-16T10:00:00Z");
const later = new Date("2026-11-19T20:00:00Z");
const deadline = new Date("2026-11-18T20:00:00Z");

const openMatch = { status: "open" as const, startsAt: later, signupDeadline: deadline, maxPlayers: 10, pricePerPlayerCents: null };
const closedMatch = { ...openMatch, status: "closed" as const, pricePerPlayerCents: 500 };

describe("planJoin", () => {
  it("confirms while there are spots", () => {
    expect(planJoin({ match: openMatch, now, confirmedCount: 3, current: null, owed: [] })).toEqual({
      type: "confirmed",
      closesMatch: false,
      amountDueCents: null,
      releaseUserId: null,
    });
  });

  it("closes the match when the last spot is taken", () => {
    const plan = planJoin({ match: openMatch, now, confirmedCount: 9, current: null, owed: [] });
    expect(plan).toMatchObject({ type: "confirmed", closesMatch: true });
  });

  it("sends to the waitlist when full", () => {
    expect(planJoin({ match: closedMatch, now, confirmedCount: 10, current: null, owed: [] })).toEqual({
      type: "waitlist",
    });
  });

  it("lets a re-joining (withdrawn) player sign up again", () => {
    expect(planJoin({ match: openMatch, now, confirmedCount: 3, current: "withdrawn", owed: [] }).type).toBe(
      "confirmed",
    );
  });

  it("takes over the oldest debt when filling a freed spot in a closed match", () => {
    const plan = planJoin({
      match: closedMatch,
      now,
      confirmedCount: 9,
      current: null,
      owed: [
        { userId: "u1", amountDueCents: 500 },
        { userId: "u2", amountDueCents: 500 },
      ],
    });
    expect(plan).toEqual({ type: "confirmed", closesMatch: false, amountDueCents: 500, releaseUserId: "u1" });
  });

  it("charges the fixed price when there is no debt to take over", () => {
    const plan = planJoin({ match: closedMatch, now, confirmedCount: 8, current: null, owed: [] });
    expect(plan).toEqual({ type: "confirmed", closesMatch: false, amountDueCents: 500, releaseUserId: null });
  });

  it("rejects duplicates, frozen and overdue matches", () => {
    expect(planJoin({ match: openMatch, now, confirmedCount: 3, current: "confirmed", owed: [] })).toMatchObject({
      reason: "already",
    });
    expect(planJoin({ match: openMatch, now, confirmedCount: 3, current: "waitlist", owed: [] })).toMatchObject({
      reason: "already",
    });
    expect(planJoin({ match: openMatch, now: later, confirmedCount: 3, current: null, owed: [] })).toMatchObject({
      reason: "frozen",
    });
    expect(
      planJoin({ match: { ...openMatch, status: "cancelled" }, now, confirmedCount: 3, current: null, owed: [] }),
    ).toMatchObject({ reason: "frozen" });
    const afterDeadline = new Date("2026-11-18T21:00:00Z");
    expect(planJoin({ match: openMatch, now: afterDeadline, confirmedCount: 3, current: null, owed: [] })).toMatchObject(
      { reason: "due" },
    );
  });
});

describe("planWithdraw", () => {
  const confirmed = { status: "confirmed" as const, amountDueCents: null, paid: false };

  it("frees the spot of an open match and promotes the waitlist", () => {
    expect(
      planWithdraw({ match: openMatch, now, mine: confirmed, firstInWaitlist: "w1", pricePerPlayerCents: null }),
    ).toEqual({ type: "withdraw", keepDebt: false, promoteUserId: "w1", promotedAmountDueCents: null });
  });

  it("passes the debt to the promoted player in a closed match", () => {
    expect(
      planWithdraw({
        match: closedMatch,
        now,
        mine: { status: "confirmed", amountDueCents: 500, paid: false },
        firstInWaitlist: "w1",
        pricePerPlayerCents: 500,
      }),
    ).toEqual({ type: "withdraw", keepDebt: false, promoteUserId: "w1", promotedAmountDueCents: 500 });
  });

  it("keeps the debt when nobody takes the spot in a closed match", () => {
    expect(
      planWithdraw({
        match: closedMatch,
        now,
        mine: { status: "confirmed", amountDueCents: 500, paid: false },
        firstInWaitlist: null,
        pricePerPlayerCents: 500,
      }),
    ).toEqual({ type: "withdraw", keepDebt: true, promoteUserId: null, promotedAmountDueCents: null });
  });

  it("keeps an already paid amount on record even if replaced", () => {
    expect(
      planWithdraw({
        match: closedMatch,
        now,
        mine: { status: "confirmed", amountDueCents: 500, paid: true },
        firstInWaitlist: "w1",
        pricePerPlayerCents: 500,
      }),
    ).toMatchObject({ keepDebt: true, promoteUserId: "w1", promotedAmountDueCents: 500 });
  });

  it("lets waitlisted players leave freely", () => {
    expect(
      planWithdraw({
        match: closedMatch,
        now,
        mine: { status: "waitlist", amountDueCents: null, paid: false },
        firstInWaitlist: "w1",
        pricePerPlayerCents: 500,
      }),
    ).toEqual({ type: "leave-waitlist" });
  });

  it("rejects when frozen or not signed up", () => {
    expect(
      planWithdraw({ match: openMatch, now: later, mine: confirmed, firstInWaitlist: null, pricePerPlayerCents: null }),
    ).toMatchObject({ reason: "frozen" });
    expect(
      planWithdraw({ match: openMatch, now, mine: null, firstInWaitlist: null, pricePerPlayerCents: null }),
    ).toMatchObject({ reason: "not-signed-up" });
  });
});

describe("live price", () => {
  it("shows what you'd pay by joining an open match", () => {
    expect(
      priceIfJoining({ status: "open", courtPriceCents: 5000, confirmedCount: 7, maxPlayers: 10, pricePerPlayerCents: null }),
    ).toBe(625);
  });

  it("shows the fixed price for closed matches", () => {
    expect(
      priceIfJoining({ status: "closed", courtPriceCents: 5000, confirmedCount: 10, maxPlayers: 10, pricePerPlayerCents: 500 }),
    ).toBe(500);
  });

  it("flags open matches past their deadline", () => {
    expect(isDueForClosing({ status: "open", signupDeadline: deadline }, new Date("2026-11-18T20:00:00Z"))).toBe(true);
    expect(isDueForClosing({ status: "closed", signupDeadline: deadline }, later)).toBe(false);
  });
});
