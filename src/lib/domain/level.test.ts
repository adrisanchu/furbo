import { describe, expect, it } from "vitest";
import { applyAdjustment, isValidAnswers, suggestRating } from "./level";

describe("self-assessment", () => {
  it("maps answers linearly onto 1.5–9.0", () => {
    expect(suggestRating([0, 0, 0, 0, 0])).toBe(1.5);
    expect(suggestRating([3, 3, 3, 3, 3])).toBe(9);
    expect(suggestRating([2, 2, 2, 2, 2])).toBe(6.5);
    expect(suggestRating([1, 2, 1, 2, 1])).toBe(5);
  });

  it("validates answers", () => {
    expect(isValidAnswers([0, 1, 2, 3, 0])).toBe(true);
    expect(isValidAnswers([0, 1, 2, 3])).toBe(false);
    expect(isValidAnswers([0, 1, 2, 3, 4])).toBe(false);
    expect(isValidAnswers([0, 1, 2, 3, 1.5])).toBe(false);
    expect(() => suggestRating([9, 9, 9, 9, 9])).toThrow();
  });

  it("allows ±1.0 adjustment, clamped to 1.0–10.0", () => {
    expect(applyAdjustment(6.5, 0.3)).toBe(6.8);
    expect(applyAdjustment(6.5, -2)).toBe(5.5);
    expect(applyAdjustment(9, 1)).toBe(10);
    expect(applyAdjustment(1.5, -1)).toBe(1);
    expect(applyAdjustment(6.1, 0.2)).toBe(6.3); // no float noise
  });
});
