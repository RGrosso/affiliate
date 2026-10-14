import { describe, expect, it } from "vitest";
import { z } from "./zod";
import { addProductSchema, productListQuerySchema } from "./products.schema";

function fieldErrors(input: unknown) {
  const result = addProductSchema.safeParse(input);
  if (result.success) return {};
  return z.flattenError(result.error).fieldErrors as Record<string, string[] | undefined>;
}

describe("addProductSchema", () => {
  it("accepts a minimal product and defaults images to an empty list", () => {
    const result = addProductSchema.parse({ title: "  Moon Lamp  " });
    expect(result).toMatchObject({ title: "Moon Lamp", images: [] });
  });

  it("asks for a title when it's missing or blank", () => {
    expect(fieldErrors({}).title).toEqual(["Please give the product a title"]);
    expect(fieldErrors({ title: "   " }).title).toEqual(["Please give the product a title"]);
  });

  it("treats an empty handle as not given, but rejects an invalid one", () => {
    expect(addProductSchema.parse({ title: "A", handle: "" }).handle).toBeUndefined();
    expect(fieldErrors({ title: "A", handle: "Not Valid" }).handle).toEqual([
      "Use lowercase letters, numbers and hyphens only",
    ]);
  });

  it("validates the price in pounds", () => {
    expect(addProductSchema.parse({ title: "A", price: 19.99 }).price).toBe(19.99);
    expect(fieldErrors({ title: "A", price: -1 }).price).toEqual(["The price can't be negative"]);
    expect(fieldErrors({ title: "A", price: 1.234 }).price).toEqual([
      "The price can have at most 2 decimal places",
    ]);
    expect(fieldErrors({ title: "A", price: "12" }).price).toEqual(["Please enter the price as a number"]);
  });

  it("only accepts http and https affiliate links", () => {
    expect(addProductSchema.parse({ title: "A", affiliateUrl: "" }).affiliateUrl).toBeUndefined();
    expect(fieldErrors({ title: "A", affiliateUrl: "ftp://example.com" }).affiliateUrl).toEqual([
      "Please enter a valid affiliate link, e.g. https://example.com",
    ]);
  });

  it("allows at most 10 images", () => {
    const images = Array.from({ length: 11 }, (_, i) => ({ url: `/images/${i}.jpg` }));
    expect(fieldErrors({ title: "A", images }).images).toEqual(["You can add up to 10 images"]);
  });
});

describe("productListQuerySchema", () => {
  const tagErrors = (tag: unknown) => {
    const result = productListQuerySchema.safeParse({ tag });
    if (result.success) throw new Error("Expected validation to fail");
    return z.flattenError(result.error).fieldErrors.tag;
  };

  it("turns a single tag into a one-item list and keeps a list as it is", () => {
    expect(productListQuerySchema.parse({ tag: " deals " }).tag).toEqual(["deals"]);
    expect(productListQuerySchema.parse({ tag: ["a", "b"] }).tag).toEqual(["a", "b"]);
    expect(productListQuerySchema.parse({}).tag).toBeUndefined();
  });

  it("rejects blank, overlong and too many tags", () => {
    expect(tagErrors("")).toEqual(["Please choose a tag from the list"]);
    expect(tagErrors(["a", " "])).toEqual(["Please choose a tag from the list"]);
    expect(tagErrors("x".repeat(101))).toEqual(["The tag can be at most 100 characters"]);
    expect(tagErrors(Array.from({ length: 21 }, (_, i) => `t${i}`))).toEqual(["You can filter by up to 20 tags"]);
  });
});
