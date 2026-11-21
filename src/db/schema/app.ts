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
    /** The owner (initially the creator): can't be demoted or removed by admins. */
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("groups_base_location_gist").using("gist", t.baseLocation),
    index("groups_owner_idx").on(t.ownerId),
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
    /** When/who registered (or last corrected) the result. */
    resultRecordedAt: timestamp("result_recorded_at", { withTimezone: true }),
    resultRecordedBy: uuid("result_recorded_by").references(() => users.id, { onDelete: "set null" }),
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

/**
 * Line-up and stats of a match (the "acta"), one row per player who played.
 * Separate from match_signups: signing up (and paying) is not the same as
 * playing — no-shows have a signup but no row here, and an admin can add a
 * member who played without signing up.
 */
export const matchPlayers = pgTable(
  "match_players",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    team: teamEnum("team").notNull(),
    isGoalkeeper: boolean("is_goalkeeper").notNull().default(false),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    saves: integer("saves").notNull().default(0),
    ownGoals: integer("own_goals").notNull().default(0),
    /** Golazos: subset of goals. */
    superGoals: integer("super_goals").notNull().default(0),
    /** Paradones: subset of saves. */
    superSaves: integer("super_saves").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.userId] }),
    index("match_players_user_idx").on(t.userId),
    check(
      "match_players_counts_valid",
      sql`${t.goals} >= 0 and ${t.assists} >= 0 and ${t.saves} >= 0 and ${t.ownGoals} >= 0
        and ${t.superGoals} between 0 and ${t.goals} and ${t.superSaves} between 0 and ${t.saves}`,
    ),
  ],
);

/**
 * Ratings players give each other after a match (0–10 in half points,
 * stored as halves 0–20). One rating per (match, rater, rated); changing it
 * overwrites. Phase 2b: anyone in the group can rate anyone who played.
 */
export const playerRatings = pgTable(
  "player_ratings",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ratedId: uuid("rated_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scoreHalves: integer("score_halves").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.raterId, t.ratedId] }),
    index("player_ratings_match_rated_idx").on(t.matchId, t.ratedId),
    index("player_ratings_rated_idx").on(t.ratedId),
    check("player_ratings_score_range", sql`${t.scoreHalves} between 0 and 20`),
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
