ALTER TABLE "generation_jobs" ADD COLUMN "template_id" text;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN "brief" jsonb;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN "input_image_path" text;