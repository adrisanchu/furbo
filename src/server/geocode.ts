import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import type { LngLat } from "@/db/geography";
import { geocodeCache } from "@/db/schema";

export type GeocodeResult = { location: LngLat; displayName: string };

function normalize(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Address → coordinates with Nominatim (OpenStreetMap). Only called when a
 * group base or match location is created/edited, and every answer
 * (including "not found") is cached in Postgres, per the OSM usage policy.
 * Returns null when nothing is found or Nominatim is unreachable.
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const key = normalize(query);
  if (key.length < 3) return null;

  const [cached] = await db.select().from(geocodeCache).where(eq(geocodeCache.query, key)).limit(1);
  if (cached) {
    return cached.location ? { location: cached.location, displayName: cached.displayName ?? query } : null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", "accept-language": "es" }).toString();

  let result: GeocodeResult | null = null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT || "Furbo/0.1" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null; // transient: don't cache
    const [hit] = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (hit) {
      result = { location: { lng: Number(hit.lon), lat: Number(hit.lat) }, displayName: hit.display_name };
    }
  } catch (err) {
    console.warn("[geocode] Nominatim unreachable:", (err as Error).message);
    return null;
  }

  await db
    .insert(geocodeCache)
    .values({ query: key, location: result?.location ?? null, displayName: result?.displayName ?? null })
    .onConflictDoNothing();
  return result;
}
