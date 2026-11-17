import { describe, expect, it } from "vitest";
import { costPerPlayerCents, formatEuros, parseEurosToCents, roundingSurplusCents } from "./money";

describe("cost split", () => {
  it("divides exactly when possible", () => {
    expect(costPerPlayerCents(5000, 8)).toBe(625);
    expect(roundingSurplusCents(5000, 8)).toBe(0);
  });

  it("rounds up to the cent and reports the surplus", () => {
    expect(costPerPlayerCents(7000, 12)).toBe(584); // 5,8333… → 5,84
    expect(roundingSurplusCents(7000, 12)).toBe(8);
    expect(costPerPlayerCents(1000, 3)).toBe(334);
    expect(roundingSurplusCents(1000, 3)).toBe(2);
  });

  it("handles free courts and empty matches", () => {
    expect(costPerPlayerCents(0, 10)).toBe(0);
    expect(costPerPlayerCents(5000, 0)).toBe(0);
    expect(roundingSurplusCents(5000, 0)).toBe(0);
  });
});

describe("euro formatting", () => {
  it("formats in Spanish style", () => {
    expect(formatEuros(625).replace(/ /g, " ")).toBe("6,25 €");
    expect(formatEuros(7000).replace(/ /g, " ")).toBe("70,00 €");
  });

  it.each([
    ["50", 5000],
    ["50,5", 5050],
    ["50.50 €", 5050],
    [" 7,25 ", 725],
    ["0", 0],
  ])("parses %s", (input, cents) => {
    expect(parseEurosToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "5,555", "1e3"])("rejects %s", (input) => {
    expect(parseEurosToCents(input)).toBeNull();
  });
});
