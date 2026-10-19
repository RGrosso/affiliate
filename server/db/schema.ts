import { pgTable, text, timestamp, pgEnum, uuid, integer, boolean, jsonb, primaryKey, index } from "drizzle-orm/pg-core";
import { UserState, userRoles } from "../../shared/types/user";
import { tagIcons } from "../../shared/types/tag";
import { StoredCollectionStatus, StoredCollectionType, StoredProductSort } from "../utils/storedCollection";
import type { StoredCollectionRules } from "../utils/storedCollectionRules";

export const roleEnum = pgEnum("role", userRoles);
export const userStateEnum = pgEnum("user_state", UserState);
export const tagIconEnum = pgEnum("tag_icon", tagIcons);
export const collectionTypeEnum = pgEnum("collection_type", StoredCollectionType);
export const collectionStatusEnum = pgEnum("collection_status", StoredCollectionStatus);
export const productSortEnum = pgEnum("product_sort", StoredProductSort);

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  /** `null` means the user hasn't chosen a password yet and must go through setup. */
  password: text("password"),
  role: roleEnum("role").default("user").notNull(),
  state: userStateEnum("state").default(UserState.Active).notNull(),
  ...timestamps,
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  handle: text("handle").notNull().unique(),
  description: text("description"),
  pricePence: integer("price_pence"),
  retailer: text("retailer"),
  brand: text("brand"),
  affiliateUrl: text("affiliate_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  isSample: boolean("is_sample").default(false).notNull(),
  authorId: uuid("author_id")
    .references(() => users.id)
    .notNull(),
  ...timestamps,
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  alt: text("alt"),
  /** 0 is the featured image. */
  position: integer("position").default(0).notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Decides whether a tag already exists, so "Air Fryers" and "air fryers" are the same tag. */
  slug: text("slug").notNull().unique(),
  description: text("description"),
  tooltip: text("tooltip"),
  icon: tagIconEnum("icon"),
  priority: integer("priority"),
  showOnCards: boolean("show_on_cards").default(false).notNull(),
  showInFilter: boolean("show_in_filter").default(false).notNull(),
  ...timestamps,
});

export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
  },
  table => [
    primaryKey({ columns: [table.productId, table.tagId] }),
    // The primary key covers lookups by product; this covers filtering products by tag
    index("product_tags_tag_id_idx").on(table.tagId),
  ]
);

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  handle: text("handle").notNull().unique(),
  /** Fixed at creation. */
  type: collectionTypeEnum("type").notNull(),
  status: collectionStatusEnum("status").default(StoredCollectionStatus.Draft).notNull(),
  /** The built-in "All" collection: it can't be deleted, and its handle, type, rules, status and sort can't change. */
  locked: boolean("locked").default(false).notNull(),
  /** Plain text. */
  description: text("description"),
  imageUrl: text("image_url"),
  imageAlt: text("image_alt"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  /** `null` for manual collections and for the locked All collection, which matches every product. */
  rules: jsonb("rules").$type<StoredCollectionRules>(),
  defaultSort: productSortEnum("default_sort").default(StoredProductSort.Newest).notNull(),
  ...timestamps,
});

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: uuid("collection_id")
      .references(() => collections.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    /** Order added, used by the manual sort. */
    position: integer("position").notNull(),
  },
  table => [
    primaryKey({ columns: [table.collectionId, table.productId] }),
    // The primary key covers lookups by collection; this covers finding a product's collections
    index("collection_products_product_id_idx").on(table.productId),
  ]
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UserRow = typeof users.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductImageRow = typeof productImages.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
