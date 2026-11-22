CREATE TYPE "public"."rating_source" AS ENUM('assessment', 'match_result', 'ratings');--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ratings_closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rating_history" ADD COLUMN "source" "rating_source" DEFAULT 'match_result' NOT NULL;--> statement-breakpoint
-- Hand-edited: existing rows without a match are self-assessments.
UPDATE "rating_history" SET "source" = 'assessment' WHERE "match_id" IS NULL;
