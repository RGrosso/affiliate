import { eq } from "drizzle-orm";
import { products } from "hub:db:schema";

export default defineApiHandler(async (event) => {
  await requireAdmin(event);

  // Images are removed by the product_images ON DELETE CASCADE foreign key
  const deleted = await db.delete(products)
    .where(eq(products.isSample, true))
    .returning({ id: products.id });

  return ok({ deleted: deleted.length }, "Sample products deleted");
});
