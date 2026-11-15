import { describe, expect, it } from "vitest";
import { parseWkbPoint, toEwkt } from "./geography";

describe("geography point", () => {
  it("parses little-endian EWKB with SRID (as returned by PostGIS)", () => {
    // SELECT 'SRID=4326;POINT(-3.6883 40.4893)'::geography
    const hex = "0101000020E6100000C4B12E6EA3810DC066F7E461A13E4440";
    const p = parseWkbPoint(hex);
    expect(p.lng).toBeCloseTo(-3.6883, 6);
    expect(p.lat).toBeCloseTo(40.4893, 6);
  });

  it("parses big-endian WKB without SRID", () => {
    const hex = "00000000013FF00000000000004000000000000000"; // POINT(1 2)
    expect(parseWkbPoint(hex)).toEqual({ lng: 1, lat: 2 });
  });

  it("rejects non-point geometries", () => {
    const line = "0102000000020000000000000000000000000000000000000000000000000000F03F000000000000F03F";
    expect(() => parseWkbPoint(line)).toThrow(/point/);
  });

  it("writes EWKT in lng/lat order", () => {
    expect(toEwkt({ lng: -3.7, lat: 40.4 })).toBe("SRID=4326;POINT(-3.7 40.4)");
  });
});
