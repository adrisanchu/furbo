import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit's CLI already loads `.env` on its own. Locally, `.env.local`
// (the dev branch) must win over it, so override. On Vercel there is no
// `.env.local` and the platform's variables are used as is.
config({ path: ".env.local", override: true, quiet: true });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
try {
  console.info(`[drizzle-kit] database host: ${new URL(url).host}`);
} catch {
  // invalid or missing URL: drizzle-kit reports it
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations should use Neon's direct (non-pooled) URL when available.
  dbCredentials: { url },
  // PostGIS creates its own tables/views in `public`; keep them out of diffs.
  extensionsFilters: ["postgis"],
  strict: true,
  verbose: true,
});
