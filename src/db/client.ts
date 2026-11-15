import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/**
 * Neon URLs use the `@neondatabase/serverless` Pool (WebSockets, supports
 * interactive transactions and `SELECT … FOR UPDATE`). Any other Postgres
 * (local Docker, a VPS) uses node-postgres. Both expose the same Drizzle API.
 */
export function createDb(url: string | undefined): Database {
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  if (isNeonUrl(url)) {
    return drizzleNeon({ client: new NeonPool({ connectionString: url }), schema }) as unknown as Database;
  }
  return drizzlePg({ client: new PgPool({ connectionString: url }), schema });
}
