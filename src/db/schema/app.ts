import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { geographyPoint } from "../geography";
import { users } from "./auth";

/** Domain tables from PRD §9. Money is stored in cents. */

export const visibilityEnum = pgEnum("group_visibility", ["public", "private"]);
export const formatEnum = pgEnum("match_format", ["f5", "f7", "f11"]);
export const memberRoleEnum = pgEnum("member_role", ["admin", "member"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "left", "banned"]);
export const matchStatusEnum = pgEnum("match_status", ["open", "closed", "played", "cancelled"]);
export const signupStatusEnum = pgEnum("signup_status", ["confirmed", "waitlist", "withdrawn"]);
export const teamEnum = pgEnum("team", ["A", "B"]);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    image: text("image"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    baseLabel: text("base_label").notNull(),
    baseLocation: geographyPoint("base_location"),
    referenceRating: doublePrecision("reference_rating").notNull(),
    defaultFormat: formatEnum("default_format").notNull().default("f7"),
    defaultCourtPriceCents: integer("default_court_price_cents"),
    whatsappUrl: text("whatsapp_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("groups_base_location_gist").using("gist", t.baseLocation),
    check("groups_reference_rating_range", sql`${t.referenceRating} between 1 and 10`),
  ],
);

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    status: memberStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] }), index("group_members_user_idx").on(t.userId)],
);

export const groupInvites = pgTable(
  "group_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    /** Set for direct email invitations; null for shareable links. */
    email: text("email"),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("group_invites_group_idx").on(t.groupId)],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    locationLabel: text("location_label").notNull(),
    location: geographyPoint("location"),
    format: formatEnum("format").notNull(),
    maxPlayers: integer("max_players").notNull(),
    minPlayers: integer("min_players").notNull(),
    courtPriceCents: integer("court_price_cents").notNull().default(0),
    /** Fixed share per player, set when the match closes. */
    pricePerPlayerCents: integer("price_per_player_cents"),
    signupDeadline: timestamp("signup_deadline", { withTimezone: true }).notNull(),
    status: matchStatusEnum("status").notNull().default("open"),
    /** Set when the deadline passes without reaching min_players (admin must decide). */
    belowMinimumAt: timestamp("below_minimum_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("matches_group_starts_idx").on(t.groupId, t.startsAt),
    index("matches_status_deadline_idx").on(t.status, t.signupDeadline),
    check("matches_players_range", sql`${t.minPlayers} >= 2 and ${t.minPlayers} <= ${t.maxPlayers}`),
  ],
);

export const matchSignups = pgTable(
  "match_signups",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: signupStatusEnum("status").notNull(),
    team: teamEnum("team"),
    /** Waitlist order (1 = next up). Null when not on the waitlist. */
    positionInQueue: integer("position_in_queue"),
    /** Fixed when the match closes. */
    amountDueCents: integer("amount_due_cents"),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.userId] }),
    index("match_signups_match_status_idx").on(t.matchId, t.status),
    index("match_signups_user_idx").on(t.userId),
  ],
);

export const ratingHistory = pgTable(
  "rating_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Null for the initial self-assessment entry. */
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    ratingBefore: doublePrecision("rating_before"),
    ratingAfter: doublePrecision("rating_after").notNull(),
    delta: doublePrecision("delta").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rating_history_user_idx").on(t.userId, t.createdAt)],
);

/** Nominatim results, cached so each address is looked up only once (OSM usage policy). */
export const geocodeCache = pgTable("geocode_cache", {
  query: text("query").primaryKey(),
  /** Null when Nominatim found nothing (also cached). */
  location: geographyPoint("location"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const selfAssessments = pgTable("self_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answers: jsonb("answers").$type<number[]>().notNull(),
  suggestedRating: doublePrecision("suggested_rating").notNull(),
  finalRating: doublePrecision("final_rating").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
