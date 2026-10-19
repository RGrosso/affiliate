import type { H3Event } from "h3";
import { z } from "#shared/schemas/zod";
import { HANDLE_PATTERN } from "#shared/schemas/products.schema";
import { reservedHandleMessage } from "#shared/schemas/collections.schema";
import { META_DESCRIPTION_LENGTH } from "#shared/utils/metaDescription";

export const collectionNotFound = () => notFound("We couldn't find that collection");

export const readCollectionId = (event: H3Event) => readIdParam(event, collectionNotFound);

/** A malformed handle can't match a collection, so it's a 404 rather than a validation error. */
export function readCollectionHandle(event: H3Event): string {
  const result = z.object({ handle: z.string().max(100).regex(HANDLE_PATTERN) }).safeParse(getRouterParams(event));
  if (!result.success) {
    throw collectionNotFound();
  }

  return result.data.handle;
}

/** Turns a unique-handle violation from a collection insert or update into a field error. */
export const rethrowAsDuplicateCollectionHandle = (error: unknown): never =>
  rethrowUniqueViolationAs("handle", "Another collection already uses this URL handle")(error);

/** The handle to save: the one given, or one built from the title. `all` belongs to the locked collection and `new` to the admin create page. */
export function resolveCollectionHandle(handle: string | undefined, title: string): string {
  const finalHandle = handle || slugify(title);

  if (!finalHandle) {
    throw apiError("VALIDATION_ERROR", "Please check the highlighted fields and try again", {
      handle: ["Please add a URL handle using letters or numbers"],
    });
  }

  const reserved = reservedHandleMessage(finalHandle);
  if (reserved) {
    throw apiError("VALIDATION_ERROR", "Please check the highlighted fields and try again", {
      handle: [reserved],
    });
  }

  return finalHandle;
}

/** What search engines show: the SEO fields, falling back to the title and the start of the description. */
export function resolveCollectionSeo(collection: { title: string; description: string | null; seoTitle: string | null; seoDescription: string | null }) {
  return {
    seoTitle: collection.seoTitle ?? collection.title,
    seoDescription: collection.seoDescription ?? (collection.description?.slice(0, META_DESCRIPTION_LENGTH).trim() || null),
  };
}
