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

  it("asks for a name with letters or numbers", () => {
    expect(fieldErrors(createTagSchema, { name: " " }).name).toEqual(["Please give the tag a name"]);
    expect(fieldErrors(createTagSchema, { name: "!!!" }).name).toEqual(["Please use at least one letter or number in the tag name"]);
    expect(fieldErrors(createTagSchema, { name: "x".repeat(51) }).name).toEqual(["The tag name can be at most 50 characters"]);
  });
});

describe("updateTagSchema", () => {
  it("defaults the optional details to empty", () => {
    expect(updateTagSchema.parse({ name: "New" })).toEqual({
      name: "New",
      description: null,
      tooltip: null,
      icon: null,
      priority: null,
      showOnCards: false,
    });
  });

  it("treats blank text as no value", () => {
    expect(updateTagSchema.parse({ name: "New", description: "", tooltip: "" })).toMatchObject({ description: null, tooltip: null });
  });

  it("only accepts the listed icons and whole-number priorities", () => {
    expect(fieldErrors(updateTagSchema, { name: "New", icon: "rocket" }).icon).toEqual(["Please choose one of the icons"]);
    expect(fieldErrors(updateTagSchema, { name: "New", priority: 1.5 }).priority).toEqual(["The priority must be a whole number"]);
  });
});
