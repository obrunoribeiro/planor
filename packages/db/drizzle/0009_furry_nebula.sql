CREATE TABLE "ai_merchant_categories" (
	"user_id" uuid NOT NULL,
	"merchant_key" text NOT NULL,
	"category_id" uuid,
	"confidence" real NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_merchant_categories_user_id_merchant_key_pk" PRIMARY KEY("user_id","merchant_key")
);
--> statement-breakpoint
ALTER TABLE "ai_merchant_categories" ADD CONSTRAINT "ai_merchant_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_merchant_categories" ADD CONSTRAINT "ai_merchant_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;