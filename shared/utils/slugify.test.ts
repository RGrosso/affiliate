import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Cast Iron Skillet, 12-inch")).toBe("cast-iron-skillet-12-inch");
  });

  it("strips accents", () => {
    expect(slugify("Crème Brûlée Set")).toBe("creme-brulee-set");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Hello World!--  ")).toBe("hello-world");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("caps the length at 100 without leaving a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(99)} b`);
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith("-")).toBe(false);
  });
});
