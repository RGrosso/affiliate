import { describe, expect, it } from "vitest";
import { HANDLE_PATTERN } from "#shared/schemas/products.schema";
import { sampleProducts } from "./sampleProducts";

describe("sampleProducts", () => {
  // The homepage row shows up to two pages of 10, so the samples should fill it
  it("has at least 20 products", () => {
    expect(sampleProducts.length).toBeGreaterThanOrEqual(20);
  });

  it("gives each a unique, valid handle", () => {
    const handles = sampleProducts.map(sample => sample.handle);

    expect(new Set(handles).size).toBe(handles.length);
    for (const handle of handles) expect(handle).toMatch(HANDLE_PATTERN);
  });

  it("gives each a brand and enough images for the gallery", () => {
    for (const sample of sampleProducts) {
      expect(sample.brand, sample.handle).not.toBe("");
      expect(sample.imageCount, sample.handle).toBeGreaterThanOrEqual(2);
    }
  });
});
