import { pageQuerySchema } from "./pagination.schema";
import { z } from "./zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

const optionalUrl = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .url({ error: `Please enter a valid ${label}, e.g. https://example.com`, protocol: /^https?$/ })
      .max(2048, `The ${label} is too long`)
      .optional()
  );

export const productImageSchema = z.object({
  url: z.string().min(1, "Image URL is required").max(2048, "The image URL is too long"),
  alt: z.string().trim().max(255, "Alt text can be at most 255 characters").optional().nullable(),
});

export const addProductSchema = z.object({
  title: z
    .string({ error: "Please give the product a title" })
    .trim()
    .min(1, "Please give the product a title")
    .max(255, "The title can be at most 255 characters"),
  description: z
    .string()
    .trim()
    .max(20_000, "The description is too long")
    .optional()
    .nullable(),
  handle: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .max(100, "The URL handle can be at most 100 characters")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only")
      .optional()
  ),
  price: z
    .number({ error: "Please enter the price as a number" })
    .min(0, "The price can't be negative")
    .max(1_000_000, "That price looks too high")
    .multipleOf(0.01, "The price can have at most 2 decimal places")
    .optional()
    .nullable(),
  retailer: z.string().trim().max(100, "The retailer name can be at most 100 characters").optional().nullable(),
  affiliateUrl: optionalUrl("affiliate link"),
  seoTitle: z.string().trim().max(70, "The page title can be at most 70 characters").optional().nullable(),
  seoDescription: z.string().trim().max(320, "The meta description can be at most 320 characters").optional().nullable(),
  images: z.array(productImageSchema).max(10, "You can add up to 10 images").default([]),
  tagIds: z.array(z.uuid("Please choose tags from the list")).max(50, "You can add up to 50 tags").default([]),
});

export type AddProductInput = z.input<typeof addProductSchema>;

export const productListQuerySchema = pageQuerySchema.extend({
  /** Tag slugs. A product matches if it has any of them. A repeated `?tag=` arrives as an array, a single one as a string. */
  tag: z.preprocess(
    value => (typeof value === "string" ? [value] : value),
    z
      .array(
        z
          .string()
          .trim()
          .min(1, "Please choose a tag from the list")
          .max(100, "The tag can be at most 100 characters"),
        { error: "Please choose tags from the list" }
      )
      .max(20, "You can filter by up to 20 tags")
      .optional()
  ),
  /** Admin only: every tag on each product, not just the ones shown on cards. */
  allTags: z.stringbool({ error: "allTags must be true or false" }).optional(),
});

export type ProductListQuery = z.output<typeof productListQuerySchema>;
