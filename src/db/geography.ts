import { customType } from "drizzle-orm/pg-core";

export type LngLat = { lng: number; lat: number };

/**
 * Parses a PostGIS point as returned by node-postgres / Neon: hex-encoded
 * (E)WKB, e.g. `0101000020E6100000…`. Only POINT geometries are supported.
 */
export function parseWkbPoint(hex: string): LngLat {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  const littleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, littleEndian);
  const hasSrid = (type & 0x20000000) !== 0;
  if ((type & 0xffff) !== 1) {
    throw new Error(`Expected a WKB point, got geometry type ${type & 0xffff}`);
  }
  const offset = hasSrid ? 9 : 5;
  return {
    lng: view.getFloat64(offset, littleEndian),
    lat: view.getFloat64(offset + 8, littleEndian),
  };
}

export function toEwkt({ lng, lat }: LngLat): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/** `geography(Point, 4326)` column mapped to `{ lng, lat }`. */
export const geographyPoint = customType<{ data: LngLat; driverData: string }>({
  dataType() {
    return "geography(Point, 4326)";
  },
  toDriver(value) {
    return toEwkt(value);
  },
  fromDriver(value) {
    return parseWkbPoint(value);
  },
});
