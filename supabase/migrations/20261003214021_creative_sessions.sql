CREATE TYPE "public"."creative_session_status" AS ENUM('conversation', 'briefed', 'ideas', 'scripted');--> statement-breakpoint
CREATE TABLE "creative_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid,
	"status" "creative_session_status" DEFAULT 'conversation' NOT NULL,
	"locale" text NOT NULL,
	"season_id" text,
	"aspect_ratio" text DEFAULT '9:16' NOT NULL,
	"tier" text,
	"turns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brief" jsonb,
	"ideas" jsonb,
	"chosen_idea" integer,
	"script" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creative_sessions_chosen_idea" CHECK ("creative_sessions"."chosen_idea" is null or "creative_sessions"."chosen_idea" between 0 and 2)
);
--> statement-breakpoint
ALTER TABLE "creative_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "text_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"task" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"cached_input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_micro_usd" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "text_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "creative_sessions" ADD CONSTRAINT "creative_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_sessions" ADD CONSTRAINT "creative_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_usage" ADD CONSTRAINT "text_usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_usage" ADD CONSTRAINT "text_usage_session_id_creative_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."creative_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creative_sessions_organization_id_created_at_index" ON "creative_sessions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "text_usage_organization_id_created_at_index" ON "text_usage" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "text_usage_session_id_index" ON "text_usage" USING btree ("session_id");