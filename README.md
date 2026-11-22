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
- **Usuarios de prueba:** el seed crea 8 jugadores `@furbo.test` con la contraseña `furbo-dev-1234`, dos grupos y un partido abierto. `alex@furbo.test` es Premium y propietario del grupo privado; `javi@furbo.test` es gratuito y propietario del público. Solo borra y recrea sus propios datos.

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

> `drizzle.config.ts` y el seed cargan `.env.local` con prioridad sobre `.env` (drizzle-kit carga `.env` por su cuenta). Si tienes un `.env` apuntando a producción, los comandos locales siguen usando la rama de `.env.local`; el host aparece al ejecutar `db:migrate`.

## Jugadores, grupos y planes

- **Identidad:** cada jugador tiene nombre, apellidos y un **apodo único** (`@alexm`): 3–20 caracteres, minúsculas, números, `_` y `.`, sin distinguir mayúsculas. El primer cambio es libre; después, uno cada 30 días. Los apellidos solo los ven los miembros de tus grupos. Quien entra con magic link completa estos datos en `/bienvenida`.
- **Roles en un grupo:** el **propietario** (quien lo crea) es siempre admin, no se le puede quitar ni expulsar, es el único que puede borrar el grupo y puede pasar la propiedad a otro miembro. Los **admins** gestionan partidos, invitaciones y miembros, y pueden nombrar a otros admins.
- **Planes** (`users.plan`, se cambia a mano hasta que haya pagos): la cuenta **gratuita** puede ser propietaria de hasta 2 grupos, siempre públicos; **Premium** hasta 10, públicos o privados. Cuenta lo que posees ahora: borrar o pasar un grupo libera el hueco. Las reglas están en `src/lib/domain/plans.ts`.

## Reglas de partidos (fase 1)

- **Estados:** `abierto` → `cerrado` (al llegar la fecha límite, al llenarse o a mano) → `jugado` (fase 2) | `cancelado`.
- **Precio:** en vivo mientras está abierto (`pista ÷ apuntados`, redondeado al céntimo hacia arriba). Al cerrar queda fijado por jugador; el sobrante del redondeo va al «bote» del grupo (informativo).
- **Lista de espera:** solo existe cuando el partido está lleno. Si alguien se borra, sube el primero.
- **Bajas tardías** (partido cerrado): quien ocupa la plaza libre (el primero de la lista o alguien que se apunte después) hereda la deuda del que se va; si nadie la ocupa, el que se borró sigue debiendo su parte.
- **Cierre automático:** los partidos vencidos se cierran al abrir la app (cierre perezoso) y con un cron diario (`/api/cron/cerrar-partidos`, el máximo en Vercel Hobby). Si no se llega al mínimo, se avisa por email a los admins.
- Toda la lógica está en funciones puras (`src/lib/domain`) con tests; el servidor la aplica en una transacción con `SELECT … FOR UPDATE` sobre el partido.

## Actas, estadísticas y nivel (fase 2a)

- **Acta del partido** (`/partidos/[id]/acta`, solo admins): antes del partido se guarda la **alineación prevista** (equipo A/B y portero); después, el **marcador** y las estadísticas de cada jugador: goles, asistencias, paradas, goles en propia, **golazos** (subconjunto de los goles) y **paradones** (subconjunto de las paradas). Se guardan como contadores por jugador y partido (`match_players`).
- Quien no está en la alineación no cuenta (no presentados). Un admin puede añadir a un miembro que jugó sin apuntarse. Apuntarse/pagar (`match_signups`) y jugar (`match_players`) son cosas distintas.
- Si los goles apuntados no cuadran con el marcador, o falta portero, se muestra un **aviso**; no impide guardar.
- **Nivel:** al guardar el acta el partido pasa a `jugado` y se aplica el Elo por equipos del PRD §5.5 (`src/lib/domain/elo.ts`), se guarda en `rating_history` y suma `matches_played` (provisional hasta 5 partidos).
- **Corregir un acta** deshace los cambios de nivel de **ese** partido y vuelve a aplicarlos con los datos nuevos (no recalcula los partidos posteriores).
- Los admins ven «Falta el acta» en Inicio para los partidos ya empezados sin resultado. El perfil muestra la evolución del nivel y los últimos partidos.

## Notas, MVP y clasificaciones (fase 2b)

- **Notas:** cuando un partido tiene acta, cualquier miembro del grupo puede poner nota (0–10, de medio en medio punto) a quien jugó, incluido él mismo (de momento se guarda todo; se podrá filtrar después). Se guardan como medios puntos (`player_ratings.score_halves`, 0–20) y se pueden cambiar cuando se quiera. Solo se muestra la **media** de cada jugador, nunca la nota individual.
- **MVP** de cada partido: la mejor media; empate → más valoraciones → más goles + asistencias.
- **Clasificaciones por grupo** (`/grupos/[id]/estadisticas`): Pichichi, Asistencias, Golazos, Zamora (menos goles encajados por partido en portería), Paradones, MVP, Mejor nota media y Fijos (más partidos). Zamora y nota media piden un mínimo de 3 partidos. Las consultas aceptan un rango de fechas (`playerTotals`), así que una «temporada» es solo un filtro por fecha.
- El perfil muestra «Tus números» (en todos tus grupos) e Inicio recuerda valorar el último partido jugado (7 días).
- Las notas ajustan el nivel desde la fase 2c (abajo).

## Las notas cuentan para el nivel (fase 2c)

- Las notas se pueden poner hasta **48 h después de guardar el acta**. Después se cierran y cada jugador recibe un **bonus** aparte del Elo del resultado:
  `bonus = 0.08 × (su media − la media del partido)`, con un máximo de **±0.15** por partido.
- Solo cuentan las notas de **otros** jugadores (las propias se ignoran para el nivel), y hacen falta **3 o más** para tener bonus; la media del partido es la de los jugadores con bonus (mínimo 2).
- El cierre se hace al abrir la app (cierre perezoso) y en el cron diario (`closeDueRatings`). Cada cambio queda en `rating_history` con `source = 'ratings'` (`'match_result'` para el Elo, `'assessment'` para la autoevaluación).
- **Corregir un acta** deshace el Elo y el bonus de ese partido y **reabre las notas** otras 48 h.
- En el partido se ve el cambio total por jugador y el desglose «Notas +0.08»; el perfil muestra un punto por partido.

## Estructura

```
src/
  app/
    page.tsx              landing pública
    (auth)/               /entrar, /registro, /recuperar, /restablecer
    (auth)/invitacion/    aceptar invitaciones (pública)
    (onboarding)/         /bienvenida: autoevaluación de nivel
    (app)/                zona con sesión: /inicio, /grupos, /partidos, /perfil, /crear
    api/auth/[...all]/    Better Auth
    api/cron/             cierre de partidos vencidos
  components/ui/          shadcn/ui
  components/app/         piezas de Furbo (tarjetas, avatares, indicador de nivel…)
  db/                     esquema Drizzle (PRD §9), cliente, seed
  lib/domain/             reglas puras con tests: dinero, nivel, partidos, horas (Europe/Madrid)
  lib/validation/         esquemas Zod compartidos cliente/servidor
  server/                 consultas, servicio de partidos, autorización, Server Actions, geocodificación
  proxy.ts                redirecciones optimistas según cookie de sesión
drizzle/                  migraciones SQL
```

- **Autorización:** `src/proxy.ts` solo mira si existe la cookie. La comprobación real se hace en servidor con `requireUser()` (`src/lib/session.ts`) en cada página y Server Action.
- **Temas:** variables de shadcn/ui bajo `[data-theme="dark|light|gamer"]` en `globals.css`, gestionadas con `next-themes`. Se guarda el tema por usuario (`users.theme`). Utilidades propias: `halo`, `halo-border`, `halo-pulse`, `font-display`.
- **Base de datos:** con una URL de Neon se usa `@neondatabase/serverless` (WebSockets, admite transacciones interactivas); con cualquier otro Postgres, `pg`. Así se puede migrar a un VPS sin tocar código (PRD §8).

## Despliegue (Vercel + Neon)

1. Importa el repo en Vercel (plan Hobby). No hace falta tocar comandos: Vercel ejecuta `pnpm vercel-build`, que aplica las migraciones (`drizzle-kit migrate`) y luego `next build`.
2. Instala la integración Neon ↔ Vercel y conéctala al proyecto de Neon: rellena `DATABASE_URL` / `DATABASE_URL_UNPOOLED` y crea una rama de Neon por cada preview, así cada preview migra su propia rama y producción migra `main`.
3. Variables en Vercel (Production y Preview): `BETTER_AUTH_SECRET` (distinto del local) y `CRON_SECRET` (protege el cron). Opcionales: `RESEND_API_KEY` y `EMAIL_FROM` (sin ellas, los emails solo aparecen en los logs de Vercel) y `NOMINATIM_USER_AGENT` (identificación ante OpenStreetMap, idealmente con una URL o email de contacto).
4. `BETTER_AUTH_URL` no hace falta en Vercel: la URL se deduce de `VERCEL_PROJECT_PRODUCTION_URL` (producción) o `VERCEL_BRANCH_URL` / `VERCEL_URL` (previews). Defínela solo con un dominio propio.
