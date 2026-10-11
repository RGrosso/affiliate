import { productImages, products } from "hub:db:schema";
import { addProductSchema } from "#shared/schemas/products.schema";

export default defineApiHandler(async (event) => {
  const { user } = await requireAdmin(event);

  const input = await readValidated(event, addProductSchema);
  const values = toProductValues(input);

  try {
    const product = await db.transaction(async (tx) => {
      const [product] = await tx.insert(products)
        .values({ ...values, authorId: user.id })
        .returning();

      if (input.images.length) {
        await tx.insert(productImages).values(toImageValues(product!.id, input.images));
      }

      return product!;
    });

    return ok(product, "Product added successfully");
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateHandleError();
    }
    throw error;
  }
});
