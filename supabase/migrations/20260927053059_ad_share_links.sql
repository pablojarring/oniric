ALTER TABLE "generation_jobs" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN "shared_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_share_token_index" ON "generation_jobs" USING btree ("share_token");