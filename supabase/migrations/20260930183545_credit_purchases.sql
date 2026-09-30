CREATE TYPE "public"."credit_purchase_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "credit_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" text NOT NULL,
	"credits" integer NOT NULL,
	"base_cents" integer NOT NULL,
	"tax_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"gateway" text NOT NULL,
	"status" "credit_purchase_status" DEFAULT 'pending' NOT NULL,
	"gateway_transaction_id" text,
	"authorization_code" text,
	"payer_name" text,
	"payer_email" text,
	"payer_phone" text,
	"payer_document" text,
	"card_brand" text,
	"card_last_digits" text,
	"failure_reason" text,
	"confirmation" jsonb,
	"lot_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "credit_purchases_amounts" CHECK ("credit_purchases"."credits" > 0 and "credit_purchases"."base_cents" >= 0 and "credit_purchases"."tax_cents" >= 0
        and "credit_purchases"."total_cents" = "credit_purchases"."base_cents" + "credit_purchases"."tax_cents"),
	CONSTRAINT "credit_purchases_paid" CHECK ("credit_purchases"."status" <> 'paid' or ("credit_purchases"."paid_at" is not null and "credit_purchases"."lot_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "credit_purchases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_lot_id_credit_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."credit_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchases_gateway_transaction" ON "credit_purchases" USING btree ("gateway","gateway_transaction_id") WHERE "credit_purchases"."gateway_transaction_id" is not null;--> statement-breakpoint
CREATE INDEX "credit_purchases_organization_id_created_at_index" ON "credit_purchases" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_purchases_status_paid_at_index" ON "credit_purchases" USING btree ("status","paid_at");