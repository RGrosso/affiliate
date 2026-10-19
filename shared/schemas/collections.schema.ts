import { ALL_COLLECTION_HANDLE, CollectionStatus, CollectionType, ProductSort } from "../types/collection";
import { collectionRulesSchema } from "./collectionRules.schema";
import { pageQuerySchema } from "./pagination.schema";
import { HANDLE_PATTERN } from "./products.schema";
import { z } from "./zod";

export const MAX_COLLECTION_PRODUCTS = 500;
export const RESERVED_HANDLE_MESSAGE = "This URL is reserved for the all products page";
export const MANUAL_SORT_MESSAGE = "Manual order is only available for collections where you pick the products";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const emptyToNull = (value: unknown) => (value === "" ? null : value);

const optionalText = (message: string, max: number) => z.preprocess(emptyToNull, z.string().trim().max(max, message).nullable().optional());

const sort = z.enum(ProductSort, { error: "Please choose how to sort the products" });
const status = z.enum(CollectionStatus, { error: "Please choose whether the collection is a draft or published" });

const productIds = z
  .array(z.uuid("Please choose products from the list"), { error: "Please choose products from the list" })
  .max(MAX_COLLECTION_PRODUCTS, `A collection can have up to ${MAX_COLLECTION_PRODUCTS} products`)
  .refine(ids => new Set(ids).size === ids.length, "Each product can only be added once");

// No defaults here: an update changes only the fields it sends, so a missing field must stay missing
const fields = {
  title: z
    .string({ error: "Please give the collection a title" })
    .trim()
    .min(1, "Please give the collection a title")
    .max(255, "The title can be at most 255 characters"),
  handle: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .max(100, "The URL handle can be at most 100 characters")
      .regex(HANDLE_PATTERN, "Use lowercase letters, numbers and hyphens only")
      .refine(handle => handle !== ALL_COLLECTION_HANDLE, RESERVED_HANDLE_MESSAGE)
      .optional()
  ),
  description: optionalText("The description can be at most 500 characters", 500),
  imageUrl: optionalText("The image URL is too long", 2048),
  imageAlt: optionalText("Alt text can be at most 255 characters", 255),
  seoTitle: optionalText("The page title can be at most 70 characters", 70),
  seoDescription: optionalText("The meta description can be at most 320 characters", 320),
  status,
  defaultSort: sort,
};

const withDefaults = {
  ...fields,
  status: fields.status.default(CollectionStatus.Draft),
  defaultSort: fields.defaultSort.default(ProductSort.Newest),
};

const manualCollection = z.object({
  ...withDefaults,
  type: z.literal(CollectionType.Manual),
  productIds: productIds.default([]),
});

const automatedCollection = z
  .object({
    ...withDefaults,
    type: z.literal(CollectionType.Automated),
    rules: collectionRulesSchema,
  })
  .refine(collection => collection.defaultSort !== ProductSort.Manual, {
    error: MANUAL_SORT_MESSAGE,
    path: ["defaultSort"],
  });

/** One schema for the form and the API. A manual collection ignores `rules`, and an automated one ignores `productIds`. */
export const createCollectionSchema = z.discriminatedUnion("type", [manualCollection, automatedCollection], {
  error: "Please choose whether you'll pick the products or use rules",
});

/** Sends only what changes. Which fields apply depends on the collection's type, so the service checks that. */
export const updateCollectionSchema = z.object({
  ...fields,
  title: fields.title.optional(),
  status: fields.status.optional(),
  defaultSort: fields.defaultSort.optional(),
  productIds: productIds.optional(),
  type: z.enum(CollectionType, { error: "Please choose whether you'll pick the products or use rules" }).optional(),
  rules: collectionRulesSchema.optional(),
});

export const previewCollectionSchema = z
  .object({
    rules: collectionRulesSchema,
    sort: sort.default(ProductSort.Newest),
  })
  .refine(preview => preview.sort !== ProductSort.Manual, { error: MANUAL_SORT_MESSAGE, path: ["sort"] });

export const collectionProductsQuerySchema = pageQuerySchema.extend({
  sort: z.preprocess(emptyToUndefined, sort.optional()),
  /** One tag slug, narrowing the results to products that have it. */
  tag: z.preprocess(
    emptyToUndefined,
    z.string({ error: "Please choose one tag" }).trim().min(1, "Please choose a tag from the list").max(100, "The tag can be at most 100 characters").optional()
  ),
});

export type CreateCollectionInput = z.input<typeof createCollectionSchema>;
export type CreateCollectionData = z.output<typeof createCollectionSchema>;
export type UpdateCollectionData = z.output<typeof updateCollectionSchema>;
export type PreviewCollectionData = z.output<typeof previewCollectionSchema>;
export type CollectionProductsQuery = z.output<typeof collectionProductsQuerySchema>;
