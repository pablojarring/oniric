CREATE TYPE "public"."credit_transaction_type" AS ENUM('grant', 'reserve', 'settle', 'refund', 'expire');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "credit_allocations" (
	"job_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"credits" integer NOT NULL,
	CONSTRAINT "credit_allocations_job_id_lot_id_pk" PRIMARY KEY("job_id","lot_id"),
	CONSTRAINT "credit_allocations_credits_positive" CHECK ("credit_allocations"."credits" > 0)
);
--> statement-breakpoint
ALTER TABLE "credit_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"granted_credits" integer NOT NULL,
	"remaining_credits" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_lots_granted_positive" CHECK ("credit_lots"."granted_credits" > 0),
	CONSTRAINT "credit_lots_remaining_in_range" CHECK ("credit_lots"."remaining_credits" between 0 and "credit_lots"."granted_credits")
);
--> statement-breakpoint
ALTER TABLE "credit_lots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"available_delta" integer NOT NULL,
	"held_delta" integer NOT NULL,
	"job_id" uuid,
	"lot_id" uuid,
	"note" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_transactions_reference" CHECK (("credit_transactions"."type" in ('grant', 'expire') and "credit_transactions"."lot_id" is not null)
        or ("credit_transactions"."type" in ('reserve', 'settle', 'refund') and "credit_transactions"."job_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_wallets" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_wallets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"provider_job_id" text,
	"model_id" text NOT NULL,
	"request" jsonb NOT NULL,
	"cost_micro_usd" bigint NOT NULL,
	"surcharge_bps" integer NOT NULL,
	"margin_bps" integer NOT NULL,
	"price_credits" integer NOT NULL,
	"outputs" jsonb,
	"error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_jobs_price_positive" CHECK ("generation_jobs"."price_credits" > 0)
);
--> statement-breakpoint
ALTER TABLE "generation_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "model_pricing" (
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"segment" "segment" NOT NULL,
	"margin_bps" integer NOT NULL,
	"min_price_credits" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_pricing_provider_model_id_segment_pk" PRIMARY KEY("provider","model_id","segment"),
	CONSTRAINT "model_pricing_margin_non_negative" CHECK ("model_pricing"."margin_bps" >= 0),
	CONSTRAINT "model_pricing_min_price_positive" CHECK ("model_pricing"."min_price_credits" >= 1)
);
--> statement-breakpoint
ALTER TABLE "model_pricing" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_allocations" ADD CONSTRAINT "credit_allocations_lot_id_credit_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."credit_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_organization_id_credit_wallets_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."credit_wallets"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_organization_id_credit_wallets_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."credit_wallets"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_lot_id_credit_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."credit_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_wallets" ADD CONSTRAINT "credit_wallets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_lots_organization_id_expires_at_index" ON "credit_lots" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_one_reserve_per_job" ON "credit_transactions" USING btree ("job_id") WHERE "credit_transactions"."type" = 'reserve';--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_one_close_per_job" ON "credit_transactions" USING btree ("job_id") WHERE "credit_transactions"."type" in ('settle', 'refund');--> statement-breakpoint
CREATE INDEX "credit_transactions_organization_id_created_at_index" ON "credit_transactions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_provider_provider_job_id_index" ON "generation_jobs" USING btree ("provider","provider_job_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_status_created_at_index" ON "generation_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_organization_id_created_at_index" ON "generation_jobs" USING btree ("organization_id","created_at");