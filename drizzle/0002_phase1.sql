CREATE TABLE "geocode_cache" (
	"query" text PRIMARY KEY NOT NULL,
	"location" geography(Point, 4326),
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "price_per_player_cents" integer;