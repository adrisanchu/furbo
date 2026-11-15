# Furbo

Web app (PWA) para organizar partidos de fútbol entre amigos: grupos, convocatorias, reparto del coste de la pista y nivel de cada jugador.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 + shadcn/ui · Drizzle ORM · Neon Postgres + PostGIS · Better Auth · Resend · Vitest.

## Puesta en marcha

Requisitos: Node 24 y pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # rellena DATABASE_URL y BETTER_AUTH_SECRET
pnpm db:migrate              # crea PostGIS y las tablas
pnpm db:seed                 # datos de prueba (opcional)
pnpm dev
```

- **Base de datos:** usa la cadena de conexión de la rama `dev` de Neon. Sin Neon, `docker compose up -d` levanta Postgres + PostGIS en `localhost:5442` (ver `.env.example`).
- **Email:** sin `RESEND_API_KEY`, los magic links y los correos de recuperación se imprimen en la consola del servidor.
- **Usuarios de prueba:** el seed crea 8 jugadores `@furbo.test` (p. ej. `alex@furbo.test`) con la contraseña `furbo-dev-1234`, dos grupos y un partido abierto. Solo borra y recrea sus propios datos.

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` · `typecheck` · `test` | Lo mismo que ejecuta CI |
| `pnpm db:generate` | Genera una migración a partir de `src/db/schema` |
| `pnpm db:migrate` | Aplica migraciones (usa `DATABASE_URL_UNPOOLED` si existe) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Datos de prueba |

> drizzle-kit escribe `"geography(Point, 4326)"` entre comillas. Si una migración nueva toca columnas `geography`, quita las comillas a mano (como en `drizzle/0001_init.sql`).

## Estructura

```
src/
  app/
    page.tsx              landing pública
    (auth)/               /entrar, /registro, /recuperar, /restablecer
    (app)/                zona con sesión: /inicio, /grupos, /partidos, /perfil
    api/auth/[...all]/    Better Auth
  components/ui/          shadcn/ui
  db/                     esquema Drizzle (PRD §9), cliente, seed
  lib/                    auth, sesión (DAL), email, validación Zod
  proxy.ts                redirecciones optimistas según cookie de sesión
drizzle/                  migraciones SQL
```

- **Autorización:** `src/proxy.ts` solo mira si existe la cookie. La comprobación real se hace en servidor con `requireUser()` (`src/lib/session.ts`) en cada página y Server Action.
- **Temas:** variables de shadcn/ui bajo `[data-theme="dark|light|gamer"]` en `globals.css`, gestionadas con `next-themes`. Se guarda el tema por usuario (`users.theme`). Utilidades propias: `halo`, `halo-border`, `halo-pulse`, `font-display`.
- **Base de datos:** con una URL de Neon se usa `@neondatabase/serverless` (WebSockets, admite transacciones interactivas); con cualquier otro Postgres, `pg`. Así se puede migrar a un VPS sin tocar código (PRD §8).

## Despliegue (Vercel + Neon)

1. Importa el repo en Vercel (plan Hobby). No hace falta tocar comandos: Vercel ejecuta `pnpm vercel-build`, que aplica las migraciones (`drizzle-kit migrate`) y luego `next build`.
2. Instala la integración Neon ↔ Vercel y conéctala al proyecto de Neon: rellena `DATABASE_URL` / `DATABASE_URL_UNPOOLED` y crea una rama de Neon por cada preview, así cada preview migra su propia rama y producción migra `main`.
3. Variables en Vercel (Production y Preview): `BETTER_AUTH_SECRET` (distinto del local). Opcionales: `RESEND_API_KEY` y `EMAIL_FROM` (sin ellas, los emails solo aparecen en los logs de Vercel).
4. `BETTER_AUTH_URL` no hace falta en Vercel: la URL se deduce de `VERCEL_PROJECT_PRODUCTION_URL` (producción) o `VERCEL_BRANCH_URL` / `VERCEL_URL` (previews). Defínela solo con un dominio propio.
