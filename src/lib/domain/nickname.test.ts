import { describe, expect, it } from "vitest";
import {
  canChangeNickname,
  fullName,
  nicknameError,
  normalizeNickname,
  shortName,
  suggestNickname,
} from "./nickname";

describe("nicknames", () => {
  it("normalizes case, spaces and a leading @", () => {
    expect(normalizeNickname("  @AlexM ")).toBe("alexm");
  });

  it.each(["alexm", "alex_m", "alex.m", "a1b", "x".repeat(20), "9lives"])("accepts %s", (n) => {
    expect(nicknameError(n)).toBeNull();
  });

  it.each([
    ["al", /Mínimo/],
    ["x".repeat(21), /Máximo/],
    ["_alex", /empezando/],
    ["álex", /sin tilde/],
    ["alex m", /sin tilde/],
    ["alex..m", /seguidos/],
    ["admin", /reservado/],
  ])("rejects %s", (n, msg) => {
    expect(nicknameError(n)).toMatch(msg);
  });

  it("allows the first change anytime, then once every 30 days", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    expect(canChangeNickname(null, now)).toBe(true);
    expect(canChangeNickname(new Date("2026-11-01T12:00:00Z"), now)).toBe(false);
    expect(canChangeNickname(new Date("2026-10-19T12:00:00Z"), now)).toBe(true);
  });

  it("suggests a handle from the name", () => {
    expect(suggestNickname("Álex", "Martín")).toBe("alexmartin");
    expect(suggestNickname("María José", "Núñez-Ibáñez")).toBe("mariajosenunezibanez");
  });

  it("formats names", () => {
    const p = { firstName: "Álex", lastName: "Martín López", name: "Álex Martín López" };
    expect(fullName(p)).toBe("Álex Martín López");
    expect(shortName(p)).toBe("Álex M.");
    expect(shortName({ firstName: null, lastName: null, name: "Legacy User" })).toBe("Legacy");
  });
});
