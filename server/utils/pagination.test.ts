import { describe, expect, it } from "vitest";
import { pageOffset, toPagedResult } from "./pagination";

describe("pageOffset", () => {
  it("skips the pages before the requested one", () => {
    expect(pageOffset({ page: 1, pageSize: 20 })).toBe(0);
    expect(pageOffset({ page: 3, pageSize: 20 })).toBe(40);
    expect(pageOffset({ page: 2, pageSize: 5 })).toBe(5);
  });
});

describe("toPagedResult", () => {
  it("carries the page details and counts the pages", () => {
    expect(toPagedResult(["a", "b"], 4, { page: 1, pageSize: 2 })).toEqual({
      items: ["a", "b"],
      page: 1,
      pageSize: 2,
      total: 4,
      totalPages: 2,
    });
  });

  it("rounds a partial last page up", () => {
    expect(toPagedResult(["a"], 5, { page: 3, pageSize: 2 }).totalPages).toBe(3);
  });

  it("has no pages when there are no items", () => {
    expect(toPagedResult([], 0, { page: 1, pageSize: 20 })).toMatchObject({ total: 0, totalPages: 0, items: [] });
  });
});
