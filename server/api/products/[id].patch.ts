import { eq } from "drizzle-orm";
import { productImages, products } from "hub:db:schema";
import { addProductSchema } from "#shared/schemas/products.schema";

// Replaces the product's fields and images. `isSample` isn't editable, so a sample stays a sample.
export default defineApiHandler(async (event) => {
  await requireAdmin(event);

  const id = await readProductId(event);
  const input = await readValidated(event, addProductSchema);
  const values = toProductValues(input);

  const updated = await db.transaction(async (tx) => {
    const [product] = await tx.update(products)
      .set(values)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (!product) return undefined;

    await tx.delete(productImages).where(eq(productImages.productId, id));
    if (input.images.length) {
      await tx.insert(productImages).values(toImageValues(id, input.images));
    }

    return product;
  }).catch(rethrowAsDuplicateHandle);

  if (!updated) {
    throw notFound("We couldn't find that product");
  }

  return ok(await findProductWithImages(id), "Product saved");
});
