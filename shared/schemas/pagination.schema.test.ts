import { describe, expect, it } from "vitest";
import { MAX_PAGE_SIZE, pageQuerySchema } from "./pagination.schema";
import { z } from "./zod";

const fieldErrors = (input: unknown) => {
  const result = pageQuerySchema.safeParse(input);
  if (result.success) throw new Error("Expected validation to fail");
  return z.flattenError(result.error).fieldErrors;
};

describe("pageQuerySchema", () => {
  it("defaults to the first page of 20", () => {
    expect(pageQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("coerces query strings to numbers", () => {
    expect(pageQuerySchema.parse({ page: "3", pageSize: "50" })).toEqual({ page: 3, pageSize: 50 });
  });

  it("uses the defaults for empty values", () => {
    expect(pageQuerySchema.parse({ page: "", pageSize: "" })).toEqual({ page: 1, pageSize: 20 });
  });

  it("accepts the largest page size", () => {
    expect(pageQuerySchema.parse({ pageSize: String(MAX_PAGE_SIZE) }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it("rejects a page size over the maximum", () => {
    expect(fieldErrors({ pageSize: "101" }).pageSize).toEqual(["The page size can be at most 100"]);
  });

  it("rejects a page or page size below 1", () => {
    expect(fieldErrors({ page: "0" }).page).toEqual(["The page must be 1 or more"]);
    expect(fieldErrors({ pageSize: "0" }).pageSize).toEqual(["The page size must be 1 or more"]);
  });

  it("rejects fractions", () => {
    expect(fieldErrors({ page: "1.5" }).page).toEqual(["The page must be a whole number"]);
    expect(fieldErrors({ pageSize: "2.5" }).pageSize).toEqual(["The page size must be a whole number"]);
  });

  it("rejects text that isn't a number", () => {
    expect(fieldErrors({ page: "abc" }).page).toHaveLength(1);
  });
});
