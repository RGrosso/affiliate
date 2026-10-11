import { z } from "./zod";

const optionalUrl = (label: string) =>
  z
    .url({ error: `Please enter a valid ${label}, e.g. https://example.com`, protocol: /^https?$/ })
    .max(2048, `The ${label} is too long`)
    .optional()
    .nullable();

export const addProductSchema = z.object({
  title: z
    .string({ error: "Please give the product a title" })
    .trim()
    .min(1, "Please give the product a title")
    .max(255, "The title can be at most 255 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "The description can be at most 1,000 characters")
    .optional()
    .nullable(),
  /** Price in major units (e.g. 19.99). Stored as whole cents. */
  price: z
    .number({ error: "Please enter the price as a number" })
    .min(0, "The price can't be negative")
    .max(1_000_000, "That price looks too high")
    .multipleOf(0.01, "The price can have at most 2 decimal places")
    .optional()
    .nullable(),
  affiliateUrl: optionalUrl("affiliate link"),
  imageUrl: optionalUrl("image URL"),
});

export type AddProductInput = z.infer<typeof addProductSchema>;
