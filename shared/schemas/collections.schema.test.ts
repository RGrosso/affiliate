import { describe, expect, it } from "vitest";
import { CollectionStatus, CollectionType, ProductSort } from "../types/collection";
import { collectionProductsQuerySchema, createCollectionSchema, previewCollectionSchema, updateCollectionSchema } from "./collections.schema";
import { z } from "./zod";

const tagId = "11111111-1111-4111-8111-111111111111";
const productA = "22222222-2222-4222-8222-222222222222";
const productB = "33333333-3333-4333-8333-333333333333";
const rules = { match: "all", rules: [{ type: "tag", operator: "has", tagId }] };

const fieldErrors = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("Expected validation to fail");
  return z.flattenError(result.error).fieldErrors as Record<string, string[] | undefined>;
};

describe("createCollectionSchema", () => {
  it("accepts a manual collection and fills in the defaults", () => {
    expect(createCollectionSchema.parse({ type: "manual", title: "  Gifts " })).toEqual({
      type: CollectionType.Manual,
      title: "Gifts",
      status: CollectionStatus.Draft,
      defaultSort: ProductSort.Newest,
      productIds: [],
    });
  });

  it("accepts a manual collection with products and manual order", () => {
    const input = { type: "manual", title: "Gifts", defaultSort: "manual", productIds: [productA, productB] };
    expect(createCollectionSchema.parse(input)).toMatchObject({ defaultSort: ProductSort.Manual, productIds: [productA, productB] });
  });

  it("accepts an automated collection with rules", () => {
    expect(createCollectionSchema.parse({ type: "automated", title: "Weddings", rules, defaultSort: "price-asc" })).toMatchObject({
      type: CollectionType.Automated,
      rules,
      defaultSort: ProductSort.PriceAsc,
    });
  });

  it("turns blank optional text into null and a blank handle into nothing", () => {
    const parsed = createCollectionSchema.parse({
      type: "manual",
      title: "Gifts",
      handle: "",
      description: "",
      imageUrl: "",
      imageAlt: "",
      seoTitle: "",
      seoDescription: "",
    });
    expect(parsed).toMatchObject({ description: null, imageUrl: null, imageAlt: null, seoTitle: null, seoDescription: null });
    expect(parsed.handle).toBeUndefined();
  });

  it("asks for a title", () => {
    expect(fieldErrors(createCollectionSchema, { type: "manual", title: " " }).title).toEqual(["Please give the collection a title"]);
    expect(fieldErrors(createCollectionSchema, { type: "manual" }).title).toEqual(["Please give the collection a title"]);
    expect(fieldErrors(createCollectionSchema, { type: "manual", title: "a".repeat(256) }).title).toEqual(["The title can be at most 255 characters"]);
  });

  it("asks for a valid type", () => {
    const message = ["Please choose whether you'll pick the products or use rules"];
    expect(fieldErrors(createCollectionSchema, { title: "Gifts" }).type).toEqual(message);
    expect(fieldErrors(createCollectionSchema, { title: "Gifts", type: "smart" }).type).toEqual(message);
  });

  it("checks the handle", () => {
    const handle = (value: string) => fieldErrors(createCollectionSchema, { type: "manual", title: "Gifts", handle: value }).handle;
    expect(handle("Not A Handle")).toEqual(["Use lowercase letters, numbers and hyphens only"]);
    expect(handle("a".repeat(101))).toContain("The URL handle can be at most 100 characters");
    expect(handle("all")).toEqual(["This URL is reserved for the all products page"]);
    expect(handle("new")).toEqual(["This URL is reserved for the add collection page"]);
    expect(createCollectionSchema.parse({ type: "manual", title: "Gifts", handle: "new-gifts" })).toMatchObject({ handle: "new-gifts" });
    expect(createCollectionSchema.parse({ type: "manual", title: "Gifts", handle: "all-gifts" })).toMatchObject({ handle: "all-gifts" });
  });

  it("limits the text fields", () => {
    const errors = fieldErrors(createCollectionSchema, {
      type: "manual",
      title: "Gifts",
      description: "a".repeat(501),
      imageUrl: "a".repeat(2049),
      imageAlt: "a".repeat(256),
      seoTitle: "a".repeat(71),
      seoDescription: "a".repeat(321),
    });
    expect(errors).toEqual({
      description: ["The description can be at most 500 characters"],
      imageUrl: ["The image URL is too long"],
      imageAlt: ["Alt text can be at most 255 characters"],
      seoTitle: ["The page title can be at most 70 characters"],
      seoDescription: ["The meta description can be at most 320 characters"],
    });
  });

  it("rejects an unknown status or sort", () => {
    const errors = fieldErrors(createCollectionSchema, { type: "manual", title: "Gifts", status: "hidden", defaultSort: "random" });
    expect(errors.status).toEqual(["Please choose whether the collection is a draft or published"]);
    expect(errors.defaultSort).toEqual(["Please choose how to sort the products"]);
  });

  it("requires rules for an automated collection and validates them", () => {
    expect(fieldErrors(createCollectionSchema, { type: "automated", title: "Weddings" }).rules).toBeDefined();
    expect(fieldErrors(createCollectionSchema, { type: "automated", title: "Weddings", rules: { match: "all", rules: [] } }).rules).toEqual([
      "Add at least one condition",
    ]);
  });

  it("doesn't allow manual order on an automated collection", () => {
    expect(fieldErrors(createCollectionSchema, { type: "automated", title: "Weddings", rules, defaultSort: "manual" }).defaultSort).toEqual([
      "Manual order is only available for collections where you pick the products",
    ]);
  });

  it("ignores rules on a manual collection and products on an automated one", () => {
    expect(createCollectionSchema.parse({ type: "manual", title: "Gifts", rules })).not.toHaveProperty("rules");
    expect(createCollectionSchema.parse({ type: "automated", title: "Weddings", rules, productIds: [productA] })).not.toHaveProperty("productIds");
  });

  it("checks the product ids", () => {
    const productIds = (value: unknown) => fieldErrors(createCollectionSchema, { type: "manual", title: "Gifts", productIds: value }).productIds;
    expect(productIds(["nope"])).toEqual(["Please choose products from the list"]);
    expect(productIds([productA, productA])).toEqual(["Each product can only be added once"]);
    expect(productIds(Array.from({ length: 501 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`))).toEqual([
      "A collection can have up to 500 products",
    ]);
    expect(productIds("nope")).toEqual(["Please choose products from the list"]);
  });
});

describe("updateCollectionSchema", () => {
  it("accepts an empty update and applies no defaults", () => {
    expect(updateCollectionSchema.parse({})).toEqual({});
  });

  it("accepts any of the fields", () => {
    const input = {
      title: "Gifts",
      handle: "gifts",
      type: "manual",
      status: "published",
      defaultSort: "manual",
      productIds: [productA],
      rules,
      description: null,
    };
    expect(updateCollectionSchema.parse(input)).toEqual(input);
  });

  it("validates the fields it is sent", () => {
    const errors = fieldErrors(updateCollectionSchema, {
      title: "",
      handle: "all",
      type: "smart",
      status: "hidden",
      defaultSort: "random",
      productIds: [productA, productA],
      seoTitle: "a".repeat(71),
    });
    expect(Object.keys(errors).sort()).toEqual(["defaultSort", "handle", "productIds", "seoTitle", "status", "title", "type"]);
  });
});

describe("previewCollectionSchema", () => {
  it("defaults to newest first", () => {
    expect(previewCollectionSchema.parse({ rules })).toEqual({ rules, sort: ProductSort.Newest });
  });

  it("needs valid rules and no manual order", () => {
    expect(fieldErrors(previewCollectionSchema, { rules: { match: "all", rules: [] } }).rules).toEqual(["Add at least one condition"]);
    expect(fieldErrors(previewCollectionSchema, { rules, sort: "manual" }).sort).toEqual([
      "Manual order is only available for collections where you pick the products",
    ]);
  });
});

describe("collectionProductsQuerySchema", () => {
  it("defaults to the first page with no sort or tag", () => {
    expect(collectionProductsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("reads a sort and one tag, and treats blanks as missing", () => {
    expect(collectionProductsQuerySchema.parse({ sort: "price-desc", tag: " gifts " })).toMatchObject({ sort: "price-desc", tag: "gifts" });
    expect(collectionProductsQuerySchema.parse({ sort: "", tag: "" })).toEqual({ page: 1, pageSize: 20 });
  });

  it("rejects an unknown sort, a repeated tag and a page size over the maximum", () => {
    expect(fieldErrors(collectionProductsQuerySchema, { sort: "random" }).sort).toEqual(["Please choose how to sort the products"]);
    expect(fieldErrors(collectionProductsQuerySchema, { tag: ["a", "b"] }).tag).toEqual(["Please choose one tag"]);
    expect(fieldErrors(collectionProductsQuerySchema, { tag: "a".repeat(101) }).tag).toEqual(["The tag can be at most 100 characters"]);
    expect(fieldErrors(collectionProductsQuerySchema, { pageSize: "500" }).pageSize).toEqual(["The page size can be at most 100"]);
  });
});
