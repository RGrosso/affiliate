import { pgTable, text, timestamp, pgEnum, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { UserState, userRoles } from "../../shared/types/user";

export const roleEnum = pgEnum("role", userRoles);
export const userStateEnum = pgEnum("user_state", UserState);

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
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
  /** URL slug, used for `/products/<handle>`. */
  handle: text("handle").notNull().unique(),
  description: text("description"),
  pricePence: integer("price_pence"),
  retailer: text("retailer"),
  affiliateUrl: text("affiliate_url"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  /** Example products seeded on first admin login; can be bulk-deleted from the dashboard. */
  isSample: boolean("is_sample").default(false).notNull(),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  ...timestamps,
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  alt: text("alt"),
  /** 0 is the featured image. */
  position: integer("position").default(0).notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type UserRow = typeof users.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductImageRow = typeof productImages.$inferSelect;
