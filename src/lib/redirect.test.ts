import { describe, expect, it } from "vitest";
import { safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/grupos/abc?tab=partidos")).toBe("/grupos/abc?tab=partidos");
  });

  it.each([undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "inicio"])(
    "falls back for %s",
    (value) => {
      expect(safeNext(value)).toBe("/inicio");
    },
  );

  it("uses the first value of repeated params", () => {
    expect(safeNext(["/perfil", "/grupos"])).toBe("/perfil");
  });
});
