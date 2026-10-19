import { z } from "./zod";

/** Where an uploaded image is kept, which also decides its URL. */
export const IMAGE_PREFIXES = ["products", "collections"] as const;

export const imagePrefixSchema = z.enum(IMAGE_PREFIXES, { error: "Please choose where the image belongs" });

export type ImagePrefix = z.output<typeof imagePrefixSchema>;
