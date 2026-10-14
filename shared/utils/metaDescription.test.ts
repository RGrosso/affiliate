import { describe, expect, it } from "vitest";
import { META_DESCRIPTION_LENGTH, metaDescription } from "./metaDescription";

describe("metaDescription", () => {
  it("prefers the SEO description", () => {
    expect(metaDescription("Best lamp", "<p>A lamp</p>")).toBe("Best lamp");
  });

  it("falls back to the description as plain text, cut to length", () => {
    expect(metaDescription(null, "<p>A <strong>bright</strong> lamp</p>")).toBe("A bright lamp");
    expect(metaDescription("", `<p>${"x".repeat(500)}</p>`)).toHaveLength(META_DESCRIPTION_LENGTH);
  });

  it("is empty when there's neither", () => {
    expect(metaDescription(null, null)).toBe("");
  });
});
