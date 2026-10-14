import type { H3Event } from "h3";
import { z } from "#shared/schemas/zod";
import { HANDLE_PATTERN, type addProductSchema } from "#shared/schemas/products.schema";

type ProductInput = z.output<typeof addProductSchema>;

export const productNotFound = () => notFound("We couldn't find that product");

export const readProductId = (event: H3Event) => readIdParam(event, productNotFound);

/** A malformed handle can't match a product, so it's a 404 rather than a validation error. */
export function readProductHandle(event: H3Event): string {
  const result = z.object({ handle: z.string().max(100).regex(HANDLE_PATTERN) }).safeParse(getRouterParams(event));
  if (!result.success) {
    throw productNotFound();
  }

  return result.data.handle;
}

/** Turns a unique-handle violation from a product insert or update into a field error. */
export const rethrowAsDuplicateHandle = (error: unknown): never =>
  rethrowUniqueViolationAs("handle", "Another product already uses this URL handle")(error);

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
