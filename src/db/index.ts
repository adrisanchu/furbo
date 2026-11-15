import "server-only";
import { createDb, type Database } from "./client";

const globalForDb = globalThis as unknown as { furboDb?: Database };

/** Shared Drizzle client (reused across hot reloads in dev). */
export const db: Database = globalForDb.furboDb ?? createDb(process.env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") globalForDb.furboDb = db;
