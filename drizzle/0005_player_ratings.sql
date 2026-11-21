CREATE TABLE "player_ratings" (
	"match_id" uuid NOT NULL,
	"rater_id" uuid NOT NULL,
	"rated_id" uuid NOT NULL,
	"score_halves" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_ratings_match_id_rater_id_rated_id_pk" PRIMARY KEY("match_id","rater_id","rated_id"),
	CONSTRAINT "player_ratings_score_range" CHECK ("player_ratings"."score_halves" between 0 and 20)
);
--> statement-breakpoint
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_rater_id_users_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_rated_id_users_id_fk" FOREIGN KEY ("rated_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_ratings_match_rated_idx" ON "player_ratings" USING btree ("match_id","rated_id");--> statement-breakpoint
CREATE INDEX "player_ratings_rated_idx" ON "player_ratings" USING btree ("rated_id");