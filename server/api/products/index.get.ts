import { desc } from "drizzle-orm";
import { products } from "hub:db:schema";

export default defineApiHandler(async () => {
  const rows = await db.select({
    id: products.id,
    title: products.title,
    description: products.description,
    priceCents: products.priceCents,
    affiliateUrl: products.affiliateUrl,
    imageUrl: products.imageUrl,
    createdAt: products.createdAt,
  })
    .from(products)
    .orderBy(desc(products.createdAt));

  return ok(rows);
});
