import { z } from "./zod";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// An empty value (`?page=`) would coerce to 0, so treat it as missing and use the default
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

// Query strings arrive as text, so both are coerced. Extend this with a route's own filters.
export const pageQuerySchema = z.object({
  page: z.preprocess(emptyToUndefined, z.coerce
    .number()
    .int("The page must be a whole number")
    .min(1, "The page must be 1 or more")
    .default(1)),
  pageSize: z.preprocess(emptyToUndefined, z.coerce
    .number()
    .int("The page size must be a whole number")
    .min(1, "The page size must be 1 or more")
    .max(MAX_PAGE_SIZE, `The page size can be at most ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE)),
});

export type PageQuery = z.output<typeof pageQuerySchema>;
