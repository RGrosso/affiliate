import type { H3Event } from "h3";
import { z } from "#shared/schemas/zod";

const tagIdSchema = z.object({
  id: z.uuid(),
});

export const tagNotFound = () => notFound("We couldn't find that tag");

export async function readTagId(event: H3Event): Promise<string> {
  const result = tagIdSchema.safeParse(getRouterParams(event));

  if (!result.success) {
    throw tagNotFound();
  }

  return result.data.id;
}

export const toTagSlug = (name: string) => slugify(name);

/** Turns a unique-slug violation from a tag insert or update into a field error on the name. */
export function rethrowAsDuplicateTag(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw apiError("CONFLICT", "A tag with this name already exists", {
      name: ["A tag with this name already exists"],
    });
  }
  throw error;
}
