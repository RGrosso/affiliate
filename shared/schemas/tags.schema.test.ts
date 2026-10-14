import { describe, expect, it } from "vitest";
import { createTagSchema, updateTagSchema } from "./tags.schema";
import { z } from "./zod";

const fieldErrors = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("Expected validation to fail");
  return z.flattenError(result.error).fieldErrors as Record<string, string[] | undefined>;
};

describe("createTagSchema", () => {
  it("trims the name", () => {
    expect(createTagSchema.parse({ name: "  Air Fryers " })).toEqual({ name: "Air Fryers" });
  });

  it("accepts every detail and validates them like an update", () => {
    const details = { description: "Cheap", tooltip: "Reduced", icon: "flame", priority: 3, showOnCards: true };
    expect(createTagSchema.parse({ name: "Deals", ...details })).toEqual({ name: "Deals", ...details });
    expect(createTagSchema.parse({ name: "Deals", description: "", tooltip: "" })).toMatchObject({ description: null, tooltip: null });
    expect(fieldErrors(createTagSchema, { name: "Deals", icon: "rocket" }).icon).toEqual(["Please choose one of the icons"]);
    expect(fieldErrors(createTagSchema, { name: "Deals", priority: 1.5 }).priority).toEqual(["The priority must be a whole number"]);
  });

  it("still requires a name", () => {
    expect(fieldErrors(createTagSchema, { tooltip: "Reduced" }).name).toEqual(["Please give the tag a name"]);
  });

  it("asks for a name with letters or numbers", () => {
    expect(fieldErrors(createTagSchema, { name: " " }).name).toEqual(["Please give the tag a name"]);
    expect(fieldErrors(createTagSchema, { name: "!!!" }).name).toEqual(["Please use at least one letter or number in the tag name"]);
    expect(fieldErrors(createTagSchema, { name: "x".repeat(51) }).name).toEqual(["The tag name can be at most 50 characters"]);
  });
});

describe("updateTagSchema", () => {
  it("leaves out fields that weren't sent, so a PATCH only changes what it names", () => {
    expect(updateTagSchema.parse({ tooltip: "Just landed" })).toEqual({ tooltip: "Just landed" });
    expect(updateTagSchema.parse({})).toEqual({});
  });

  it("still validates a name when one is sent", () => {
    expect(fieldErrors(updateTagSchema, { name: " " }).name).toEqual(["Please give the tag a name"]);
  });

  it("treats blank text as no value", () => {
    expect(updateTagSchema.parse({ name: "New", description: "", tooltip: "" })).toMatchObject({ description: null, tooltip: null });
  });

  it("only accepts the listed icons and whole-number priorities", () => {
    expect(fieldErrors(updateTagSchema, { name: "New", icon: "rocket" }).icon).toEqual(["Please choose one of the icons"]);
    expect(fieldErrors(updateTagSchema, { name: "New", priority: 1.5 }).priority).toEqual(["The priority must be a whole number"]);
  });
});
