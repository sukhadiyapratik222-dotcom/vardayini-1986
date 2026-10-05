ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "session_id" varchar(120);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_id" integer;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_variant_id_product_variants_id_fk'
  ) THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
