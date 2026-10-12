ALTER TABLE "installment_plans" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;