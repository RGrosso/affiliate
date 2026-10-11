CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "handle" text;--> statement-breakpoint
-- Existing products get their id as a handle so the column can be NOT NULL
UPDATE "products" SET "handle" = "id"::text WHERE "handle" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "retailer" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_handle_unique" UNIQUE("handle");--> statement-breakpoint
-- Move single image URLs into product_images before dropping the old column
INSERT INTO "product_images" ("product_id", "url", "position") SELECT "id", "image_url", 0 FROM "products" WHERE "image_url" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "image_url";