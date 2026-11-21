# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Furbo is a mobile-first PWA for organising football matches among friends (groups, sign-ups, splitting the pitch cost, player level). Next.js 16 App Router · React 19 · Tailwind v4 + shadcn/ui · Drizzle ORM on Neon Postgres + PostGIS · Better Auth · Resend · Vitest. Node 24, pnpm 10. The README (in Spanish) covers setup, deployment and the match rules in detail.

## Commands

```bash
pnpm dev                     # Next dev server on :3000
pnpm lint                    # eslint
pnpm typecheck               # next typegen && tsc --noEmit
pnpm test                    # vitest run (src/**/*.test.ts, node env)
pnpm test src/lib/domain/money.test.ts   # single file
pnpm test -t "waitlist"      # filter by test name
pnpm build
pnpm db:generate             # migration from src/db/schema
pnpm db:migrate              # apply migrations (prefers DATABASE_URL_UNPOOLED)
pnpm db:seed                 # test data: 8 users @furbo.test / furbo-dev-1234
```

CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → build. Vercel runs `pnpm vercel-build` (= `drizzle-kit migrate && next build`), so merged migrations hit that environment's database on deploy.

## Environment / database safety

- `.env` may point at the **production** Neon branch; `.env.local` is the dev branch. drizzle-kit auto-loads `.env`, so `drizzle.config.ts` and `src/db/seed.ts` re-load `.env.local` with `override: true`. `db:migrate` prints the target host — check it before migrating or seeding.
- Ad-hoc scripts that import server code: `tsx --env-file=.env.local --conditions=react-server <file>` (the condition stubs out `server-only`).
- No Neon? `docker compose up -d` gives Postgres + PostGIS on `localhost:5442`.
- Without `RESEND_API_KEY`, emails (magic links, resets, below-minimum alerts) are logged to the server console.
- drizzle-kit emits `"geography(Point, 4326)"` quoted; remove the quotes by hand in any new migration touching geography columns (see `drizzle/0001_init.sql`).

## Architecture

Layered, with dependencies pointing inward:

1. **`src/lib/domain/`** — pure functions, unit-tested: money (all amounts in **cents**, per-player price rounds up), level, match rules (`planJoin` / `planWithdraw` return a plan instead of touching the DB), and time. All times are entered and shown as **Europe/Madrid** wall time (`zonedLocalToUtc` etc. for `datetime-local` inputs).
2. **`src/lib/validation/`** — Zod v4 schemas shared by client forms and Server Actions (`*FormSchema` + `to*Values` converters from form shape to DB values).
3. **`src/server/`** (all `server-only`):
   - `actions/*.ts` — `"use server"` mutations. Every action wraps its body in `runAction()` (`server/action.ts`), which returns `ActionResult<T>` = `{ ok: true, data } | { ok: false, error }`. Throw `ActionError` for user-facing Spanish messages; ZodErrors become their first issue message; anything else is logged and genericised. Validate ids with `idSchema`, authorise with `requireMember` / `requireAdmin` (`server/authz.ts`), and call `refresh()` from `next/cache` after writes.
   - `match-service.ts` — applies domain plans inside `db.transaction` after locking the match row (`SELECT … FOR UPDATE` via `lockMatch`). Any sign-up/withdraw/close logic must go through here to stay race-safe.
   - `report-service.ts` — the match report ("acta"): replaces the line-up/stats in `match_players` and, with a result, applies the team Elo (`lib/domain/elo.ts`) to `users.rating` + `rating_history`, all under the same match lock. Corrections revert that match's deltas first.
   - Ratings (phase 2b): `actions/ratings.ts` upserts `player_ratings` (halves 0–20); `queries.ts` `playerTotals()` aggregates stats, ratings and MVPs per player for a group/user/date range in one SQL query (MVP tie-breaks must match `pickMvp` in `lib/domain/ratings.ts`); `lib/domain/leaderboards.ts` turns totals into rankings.
   - `queries.ts` — read queries for pages; `geocode.ts` — Nominatim with a DB cache.
4. **`src/app/`** — route groups `(auth)` (public sign-in/up/reset/invitations), `(onboarding)` (`/bienvenida` level self-assessment), `(app)` (signed-in area). Pages are server components that call `requireUser()` and `queries`; forms are client components using react-hook-form + `zodResolver(sharedSchema)`, calling the action and showing `sonner` toasts based on `result.ok`.

### Cross-cutting

- **Identity:** users have `firstName`, `lastName` and a unique lowercase `nickname` (`src/lib/domain/nickname.ts`). Sign-up sends them to Better Auth, whose `databaseHooks.user.create.before` validates them; `update.before` rejects identity changes through Better Auth's `/update-user`, so they only change via `updateProfile` (30-day nickname rule). Users without a nickname (magic link) are sent to `/bienvenida` to complete it.
- **Ownership & plans:** `groups.owner_id` is the owner (always admin, can't be demoted or removed, only one who deletes or transfers — `requireOwner`). Group creation is limited by `users.plan` via `checkGroupQuota` (`src/lib/domain/plans.ts`): free = 2 public groups, premium = 10 of any kind.

- **Auth:** Better Auth (`src/lib/auth.ts`, client in `auth-client.ts`, handler at `api/auth/[...all]`). `src/proxy.ts` (Next 16's replacement for middleware) only checks the cookie exists and redirects to `/entrar?next=…`; the real check is `requireUser()` / `getSession()` in `src/lib/session.ts`, which every page and action must call. Signed-in users are bounced away from auth pages in the auth layout, not in the proxy (stale cookies would loop).
- **Match auto-closing:** overdue open matches are closed lazily in `(app)/layout.tsx` on every signed-in request and by the daily Vercel cron `/api/cron/cerrar-partidos` (`vercel.json`, guarded by `CRON_SECRET`). Both use `closeDueMatches()`.
- **DB client:** `src/db/client.ts` picks `@neondatabase/serverless` for `*.neon.tech` URLs (WebSockets, needed for interactive transactions) and `pg` otherwise; both are typed as `NodePgDatabase`. Schema lives in `src/db/schema/` (`auth.ts` = Better Auth tables, `app.ts` = domain tables); PostGIS points use the custom type in `src/db/geography.ts`.
- **App URL:** `src/lib/app-url.ts` derives the public origin from Vercel system env vars; `BETTER_AUTH_URL` overrides it. Use `absoluteUrl()` for links in emails.
- **Theming:** `dark` / `light` / `gamer` themes via `next-themes` with `[data-theme=…]` tokens in `globals.css`; the user's choice is persisted in `users.theme` and synced by `components/app/theme-sync.tsx`. Custom utilities: `halo`, `halo-border`, `halo-pulse`, `font-display`.
- `next.config.ts` uses `output: "standalone"` so the app can also run on a VPS. Cache Components are deliberately off (nearly every page is per-user).

## Conventions

- UI copy, routes (`/grupos`, `/partidos`, `/crear`…) and user-facing errors are in **Spanish**; code, identifiers and comments are in English.
- Comments reference PRD sections (e.g. "PRD §5.4"); the PRD itself is not in the repo.
- `src/components/ui/` is shadcn/ui (generated; `components.json`). Furbo-specific pieces go in `src/components/app/`, form field wrappers in `src/components/form/`.
- Import alias `@/` → `src/`.
