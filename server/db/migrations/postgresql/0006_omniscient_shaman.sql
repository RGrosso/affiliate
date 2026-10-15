CREATE TYPE "public"."collection_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."collection_type" AS ENUM('manual', 'automated');--> statement-breakpoint
CREATE TYPE "public"."product_sort" AS ENUM('newest', 'oldest', 'price_asc', 'price_desc', 'title_asc', 'title_desc', 'manual');--> statement-breakpoint
CREATE TABLE "collection_products" (
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "collection_products_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"handle" text NOT NULL,
	"type" "collection_type" NOT NULL,
	"status" "collection_status" DEFAULT 'draft' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"description" text,
	"image_url" text,
	"image_alt" text,
	"seo_title" text,
	"seo_description" text,
	"rules" jsonb,
	"default_sort" "product_sort" DEFAULT 'newest' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "show_in_filter" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_products_product_id_idx" ON "collection_products" USING btree ("product_id");--> statement-breakpoint
-- The locked "All" collection. It exists on every database, so the shop always has a /collections/all page.
INSERT INTO "collections" ("id", "title", "handle", "type", "status", "locked", "description", "rules", "default_sort")
VALUES ('00000000-0000-4000-8000-000000000001', 'All products', 'all', 'automated', 'published', true, 'Every product in the shop, newest first.', NULL, 'newest');