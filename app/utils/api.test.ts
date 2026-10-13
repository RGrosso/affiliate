import { describe, expect, it } from "vitest";
import { getApiError, toFormErrors } from "./api";

describe("getApiError", () => {
  it("returns the ApiError body from a $fetch error", () => {
    const body = { success: false, code: "NOT_FOUND", message: "We couldn't find that product" };
    expect(getApiError({ data: body })).toEqual(body);
  });

  it("falls back to a connection message for anything else", () => {
    for (const error of [new Error("Failed to fetch"), null, { data: "<html>" }]) {
      expect(getApiError(error)).toEqual({
        success: false,
        code: "INTERNAL_ERROR",
        message: "We couldn't reach the server. Please check your connection and try again.",
      });
    }
  });
});

describe("toFormErrors", () => {
  it("maps the first message of each field and skips empty ones", () => {
    expect(toFormErrors({ title: ["Too long", "Also wrong"], handle: [] })).toEqual([
      { name: "title", message: "Too long" },
    ]);
  });

  it("handles no field errors", () => {
    expect(toFormErrors()).toEqual([]);
  });
});
