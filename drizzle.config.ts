import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations should use Neon's direct (non-pooled) URL when available.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  // PostGIS creates its own tables/views in `public`; keep them out of diffs.
  extensionsFilters: ["postgis"],
  strict: true,
  verbose: true,
});
