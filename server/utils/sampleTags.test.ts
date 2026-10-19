import { describe, expect, it } from "vitest";
import { tagIcons } from "#shared/types/tag";
import { sampleProducts } from "./sampleProducts";
import { sampleProductTags, sampleTags } from "./sampleTags";

describe("sampleTags", () => {
  it("has unique slugs", () => {
    const slugs = sampleTags.map(tag => tag.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("under-20");
  });

  it("uses known icons and has some tags on cards and some in the filter", () => {
    for (const tag of sampleTags) expect(tagIcons, tag.name).toContain(tag.icon);

    expect(sampleTags.filter(tag => tag.showOnCards).length).toBeGreaterThanOrEqual(2);
    expect(sampleTags.filter(tag => tag.showInFilter).length).toBeGreaterThanOrEqual(2);
    expect(sampleTags.filter(tag => !tag.showOnCards).length).toBeGreaterThanOrEqual(2);
  });

  it("only tags sample products, with tags that exist", () => {
    const handles = new Set(sampleProducts.map(sample => sample.handle));
    const slugs = new Set(sampleTags.map(tag => tag.slug));

    for (const [handle, tagSlugs] of Object.entries(sampleProductTags)) {
      expect(handles, handle).toContain(handle);
      for (const slug of tagSlugs) expect(slugs, `${handle}: ${slug}`).toContain(slug);
      expect(new Set(tagSlugs).size, handle).toBe(tagSlugs.length);
    }
  });

  it("puts every tag on at least two products, and one to three tags on most products", () => {
    const counts = new Map<string, number>();
    for (const tagSlugs of Object.values(sampleProductTags)) for (const slug of tagSlugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);

    for (const tag of sampleTags) expect(counts.get(tag.slug) ?? 0, tag.name).toBeGreaterThanOrEqual(2);

    const perProduct = sampleProducts.map(sample => sampleProductTags[sample.handle]?.length ?? 0);
    expect(perProduct.every(count => count <= 3)).toBe(true);
    expect(perProduct.filter(count => count >= 1).length).toBeGreaterThanOrEqual(Math.ceil(sampleProducts.length * 0.8));
  });
});
