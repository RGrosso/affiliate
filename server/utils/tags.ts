import type { H3Event } from "h3";

export const tagNotFound = () => notFound("We couldn't find that tag");

export const readTagId = (event: H3Event) => readIdParam(event, tagNotFound);

/** Turns a unique-slug violation from a tag insert or update into a field error on the name. */
export const rethrowAsDuplicateTag = (error: unknown): never => rethrowUniqueViolationAs("name", "A tag with this name already exists")(error);
