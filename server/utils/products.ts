import type { H3Event } from "h3";
import { z } from "#shared/schemas/zod";
import type { addProductSchema } from "#shared/schemas/products.schema";

type ProductInput = z.output<typeof addProductSchema>;

const productIdSchema = z.object({
  id: z.uuid(),
});

export const productNotFound = () => notFound("We couldn't find that product");

export async function readProductId(event: H3Event): Promise<string> {
  const result = productIdSchema.safeParse(getRouterParams(event));

  if (!result.success) {
    throw productNotFound();
  }

  return result.data.id;
}

/** Turns a unique-handle violation from a product insert or update into a field error. */
export function rethrowAsDuplicateHandle(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw apiError("CONFLICT", "Another product already uses this URL handle", {
      handle: ["Another product already uses this URL handle"],
    });
  }
  throw error;
}

export function toProductValues({ price, images: _images, tagIds: _tagIds, handle, ...fields }: ProductInput) {
  const finalHandle = handle || slugify(fields.title);

  if (!finalHandle) {
    throw apiError("VALIDATION_ERROR", "Please check the highlighted fields and try again", {
      handle: ["Please add a URL handle using letters or numbers"],
    });
  }

  return {
    ...fields,
    handle: finalHandle,
    pricePence: price == null ? null : Math.round(price * 100),
  };
}

export function toImageValues(productId: string, images: ProductInput["images"]) {
  return images.map((image, position) => ({
    productId,
    url: image.url,
    alt: image.alt,
    position,
  }));
}
