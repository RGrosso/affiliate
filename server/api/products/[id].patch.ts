import { eq } from "drizzle-orm";
import { productImages, products } from "hub:db:schema";
import { addProductSchema } from "#shared/schemas/products.schema";

/** Replaces a product's fields and images. Sample products stay flagged as samples. */
export default defineApiHandler(async (event) => {
  await requireAdmin(event);

  const { id } = await getValidatedRouterParams(event, params => productIdSchema.parse(params))
    .catch(() => {
      throw notFound("We couldn't find that product");
    });

  const input = await readValidated(event, addProductSchema);
  const values = toProductValues(input);

  try {
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
    });

    if (!updated) {
      throw notFound("We couldn't find that product");
    }

    return ok(await findProductWithImages(id), "Product saved");
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateHandleError();
    }
    throw error;
  }
});
