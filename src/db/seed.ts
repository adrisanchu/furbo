/**
 * Development seed: a few players, two groups and an open match.
 *
 *   pnpm db:seed
 *
 * Only touches rows it owns (users with an @furbo.test email and what hangs
 * from them), so it is safe to re-run on a dev branch. All seeded users share
 * the password below.
 */
import { config } from "dotenv";

// .env.local (dev branch) wins over .env, which may point at production.
config({ path: ".env.local", override: true, quiet: true });

import { hashPassword } from "better-auth/crypto";
import { inArray, like } from "drizzle-orm";
import { createDb } from "./client";
import { accounts, groupMembers, groups, matches, matchSignups, ratingHistory, users } from "./schema";

const SEED_DOMAIN = "@furbo.test";
const SEED_PASSWORD = "furbo-dev-1234";

const players = [
  { name: "Álex Martín", email: `alex${SEED_DOMAIN}`, rating: 6.4, position: "midfielder" },
  { name: "Javi Velasco", email: `javi${SEED_DOMAIN}`, rating: 6.1, position: "forward" },
  { name: "Lucía Campos", email: `lucia${SEED_DOMAIN}`, rating: 5.8, position: "defender" },
  { name: "Marta Ruiz", email: `marta${SEED_DOMAIN}`, rating: 5.2, position: "any" },
  { name: "Dani Navarro", email: `dani${SEED_DOMAIN}`, rating: 6.9, position: "goalkeeper" },
  { name: "Sergio Ortega", email: `sergio${SEED_DOMAIN}`, rating: 4.7, position: "defender" },
  { name: "Paula Gil", email: `paula${SEED_DOMAIN}`, rating: 5.5, position: "midfielder" },
  { name: "Hugo Serrano", email: `hugo${SEED_DOMAIN}`, rating: 7.2, position: "forward" },
] as const;

function daysFromNow(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed with NODE_ENV=production.");
  }
  const db = createDb(process.env.DATABASE_URL);

  // Clean previous seed data. Groups first (created_by has no cascade).
  const old = await db.select({ id: users.id }).from(users).where(like(users.email, `%${SEED_DOMAIN}`));
  if (old.length) {
    const ids = old.map((u) => u.id);
    await db.delete(groups).where(inArray(groups.createdBy, ids));
    await db.delete(users).where(inArray(users.id, ids));
  }

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const inserted = await db
    .insert(users)
    .values(
      players.map((p) => ({
        name: p.name,
        email: p.email,
        emailVerified: true,
        rating: p.rating,
        ratingProvisional: false,
        matchesPlayed: 6,
        preferredPosition: p.position,
      })),
    )
    .returning({ id: users.id, email: users.email, rating: users.rating });

  await db.insert(accounts).values(
    inserted.map((u) => ({ userId: u.id, accountId: u.id, providerId: "credential", password: passwordHash })),
  );
  await db
    .insert(ratingHistory)
    .values(inserted.map((u) => ({ userId: u.id, ratingBefore: null, ratingAfter: u.rating!, delta: 0 })));

  const [alex, javi, ...rest] = inserted;

  const [jueves, domingo] = await db
    .insert(groups)
    .values([
      {
        name: "Los del Jueves",
        description: "Fútbol 7 todos los jueves después del curro.",
        visibility: "private",
        baseLabel: "Pabellón Municipal Norte, Madrid",
        baseLocation: { lng: -3.6883, lat: 40.4893 },
        referenceRating: 6,
        defaultFormat: "f7",
        defaultCourtPriceCents: 7000,
        createdBy: alex.id,
      },
      {
        name: "Pachanga del domingo",
        description: "Fútbol 5 tranquilo los domingos por la mañana. Todos los niveles.",
        visibility: "public",
        baseLabel: "Polideportivo La Elipa, Madrid",
        baseLocation: { lng: -3.6497, lat: 40.4234 },
        referenceRating: 5.5,
        defaultFormat: "f5",
        defaultCourtPriceCents: 5000,
        createdBy: javi.id,
      },
    ])
    .returning({ id: groups.id });

  await db.insert(groupMembers).values([
    { groupId: jueves.id, userId: alex.id, role: "admin" },
    { groupId: jueves.id, userId: javi.id, role: "member" },
    ...rest.map((u) => ({ groupId: jueves.id, userId: u.id, role: "member" as const })),
    { groupId: domingo.id, userId: javi.id, role: "admin" },
    { groupId: domingo.id, userId: alex.id, role: "member" },
    { groupId: domingo.id, userId: rest[0].id, role: "member" },
    { groupId: domingo.id, userId: rest[1].id, role: "member" },
  ]);

  const [thursdayMatch] = await db
    .insert(matches)
    .values({
      groupId: jueves.id,
      startsAt: daysFromNow(4, 21),
      durationMin: 60,
      locationLabel: "Pabellón Municipal Norte, Madrid",
      location: { lng: -3.6883, lat: 40.4893 },
      format: "f7",
      maxPlayers: 14,
      minPlayers: 10,
      courtPriceCents: 7000,
      signupDeadline: daysFromNow(3, 21),
      createdBy: alex.id,
    })
    .returning({ id: matches.id });

  await db.insert(matchSignups).values(
    inserted.map((u) => ({ matchId: thursdayMatch.id, userId: u.id, status: "confirmed" as const })),
  );

  console.info(
    `Seeded ${inserted.length} players, 2 groups and 1 open match.\nLog in as ${alex.email} / ${SEED_PASSWORD}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
