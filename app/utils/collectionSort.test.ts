import { describe, expect, it } from "vitest";
import { collectionSortOptions, isProductSort } from "./collectionSort";

describe("collectionSortOptions", () => {
  it("offers every sort with British labels, starting with Featured, for a manual collection", () => {
    expect(collectionSortOptions(true)).toEqual([
      { label: "Featured", value: "manual" },
      { label: "Newest", value: "newest" },
      { label: "Oldest", value: "oldest" },
      { label: "Price: low to high", value: "price-asc" },
      { label: "Price: high to low", value: "price-desc" },
      { label: "A–Z", value: "title-asc" },
      { label: "Z–A", value: "title-desc" },
    ]);
  });

  it("leaves out Featured for an automated collection", () => {
    expect(collectionSortOptions(false).map(option => option.value)).not.toContain("manual");
    expect(collectionSortOptions(false)).toHaveLength(6);
  });
});

describe("isProductSort", () => {
  it("accepts a sort the collection offers", () => {
    expect(isProductSort("price-asc", false)).toBe(true);
    expect(isProductSort("manual", true)).toBe(true);
  });

  it("rejects manual for an automated collection, and anything unknown", () => {
    expect(isProductSort("manual", false)).toBe(false);
    expect(isProductSort("cheapest", true)).toBe(false);
    expect(isProductSort(undefined, true)).toBe(false);
  });
});
