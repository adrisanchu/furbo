import { describe, expect, it } from "vitest";
import { defaultMatchSchedule, formatRelativeDay, formatShortDate, formatTime, utcToZonedLocal, zonedLocalToUtc } from "./time";

describe("Madrid wall time", () => {
  it("converts winter time (UTC+1)", () => {
    expect(zonedLocalToUtc("2026-11-19T21:00")?.toISOString()).toBe("2026-11-19T20:00:00.000Z");
  });

  it("converts summer time (UTC+2)", () => {
    expect(zonedLocalToUtc("2026-07-02T19:30")?.toISOString()).toBe("2026-07-02T17:30:00.000Z");
  });

  it("handles the DST switch days", () => {
    // 29 Mar 2026: 02:00 → 03:00. 10:00 that day is already UTC+2.
    expect(zonedLocalToUtc("2026-03-29T10:00")?.toISOString()).toBe("2026-03-29T08:00:00.000Z");
    // 25 Oct 2026: 03:00 → 02:00. 10:00 that day is UTC+1.
    expect(zonedLocalToUtc("2026-10-25T10:00")?.toISOString()).toBe("2026-10-25T09:00:00.000Z");
  });

  it("round-trips to datetime-local values", () => {
    for (const local of ["2026-11-19T21:00", "2026-07-02T19:30", "2027-01-01T00:15"]) {
      expect(utcToZonedLocal(zonedLocalToUtc(local)!)).toBe(local);
    }
  });

  it("rejects malformed input", () => {
    expect(zonedLocalToUtc("19/11/2026 21:00")).toBeNull();
    expect(zonedLocalToUtc("")).toBeNull();
  });

  it("formats for display", () => {
    const d = zonedLocalToUtc("2026-11-19T21:00")!;
    expect(formatTime(d)).toBe("21:00");
    expect(formatShortDate(d)).toBe("JUE 19 NOV");
  });

  it("describes relative days by Madrid calendar date", () => {
    const now = zonedLocalToUtc("2026-11-15T23:30")!;
    expect(formatRelativeDay(zonedLocalToUtc("2026-11-16T00:30")!, now)).toBe("mañana");
    expect(formatRelativeDay(zonedLocalToUtc("2026-11-19T21:00")!, now)).toBe("en 4 días");
    expect(formatRelativeDay(zonedLocalToUtc("2026-11-15T08:00")!, now)).toBe("hoy");
  });

  it("proposes next week at 21:00 with a 24 h deadline", () => {
    const now = zonedLocalToUtc("2026-11-15T18:00")!;
    expect(defaultMatchSchedule(now)).toEqual({ startsAt: "2026-11-22T21:00", signupDeadline: "2026-11-21T21:00" });
  });
});
