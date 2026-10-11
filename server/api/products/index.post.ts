import { products } from "hub:db:schema";
import { addProductSchema } from "#shared/schemas/products.schema";

export default defineApiHandler(async (event) => {
  const { user } = await requireAdmin(event);

  const { title, description, price, affiliateUrl, imageUrl } = await readValidated(event, addProductSchema);

  const [product] = await db.insert(products)
    .values({
      title,
      description,
      priceCents: price == null ? null : Math.round(price * 100),
      affiliateUrl,
      imageUrl,
      authorId: user.id,
    })
    .returning();

  return ok(product, "Product added successfully");
});
