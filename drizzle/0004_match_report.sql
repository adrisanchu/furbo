CREATE TABLE "match_players" (
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"team" "team" NOT NULL,
	"is_goalkeeper" boolean DEFAULT false NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"saves" integer DEFAULT 0 NOT NULL,
	"own_goals" integer DEFAULT 0 NOT NULL,
	"super_goals" integer DEFAULT 0 NOT NULL,
	"super_saves" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_players_match_id_user_id_pk" PRIMARY KEY("match_id","user_id"),
	CONSTRAINT "match_players_counts_valid" CHECK ("match_players"."goals" >= 0 and "match_players"."assists" >= 0 and "match_players"."saves" >= 0 and "match_players"."own_goals" >= 0
        and "match_players"."super_goals" between 0 and "match_players"."goals" and "match_players"."super_saves" between 0 and "match_players"."saves")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "result_recorded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "result_recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_players_user_idx" ON "match_players" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_result_recorded_by_users_id_fk" FOREIGN KEY ("result_recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_signups" DROP COLUMN "team";