ALTER TABLE "transactions" ADD COLUMN "installment_number" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_count" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "bill_month" text;