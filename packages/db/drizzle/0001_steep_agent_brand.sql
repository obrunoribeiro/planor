ALTER TABLE "accounts" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_external_id_idx" ON "accounts" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connections_aggregator_item_id_idx" ON "connections" USING btree ("aggregator_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_aggregator_id_idx" ON "institutions" USING btree ("aggregator_id");