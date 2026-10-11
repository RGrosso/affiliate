import { productImages, products } from "hub:db:schema";
import { addProductSchema } from "#shared/schemas/products.schema";

export default defineApiHandler(async (event) => {
  const { user } = await requireAdmin(event);

  const { price, images, handle, ...fields } = await readValidated(event, addProductSchema);
  const finalHandle = handle || slugify(fields.title);

  if (!finalHandle) {
    throw apiError("VALIDATION_ERROR", "Please check the highlighted fields and try again", {
      handle: ["Please add a URL handle using letters or numbers"],
    });
  }

  try {
    const product = await db.transaction(async (tx) => {
      const [product] = await tx.insert(products)
        .values({
          ...fields,
          handle: finalHandle,
          priceCents: price == null ? null : Math.round(price * 100),
          authorId: user.id,
        })
        .returning();

      if (images.length) {
        await tx.insert(productImages).values(images.map((image, position) => ({
          productId: product!.id,
          url: image.url,
          alt: image.alt,
          position,
        })));
      }

      return product!;
    });

    return ok(product, "Product added successfully");
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw apiError("CONFLICT", "Another product already uses this URL handle", {
        handle: ["Another product already uses this URL handle"],
      });
    }
    throw error;
  }
});

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
