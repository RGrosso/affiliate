import { pgTable, text, timestamp, pgEnum, uuid, integer } from "drizzle-orm/pg-core";
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
  description: text("description"),
  priceCents: integer("price_cents"),
  affiliateUrl: text("affiliate_url"),
  imageUrl: text("image_url"),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  ...timestamps,
});

export type UserRow = typeof users.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
