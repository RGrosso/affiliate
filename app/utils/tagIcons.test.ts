import { describe, expect, it } from "vitest";
import { tagIcons } from "#shared/types/tag";
import { tagIconLabels, tagIconNames } from "./tagIcons";

describe("tag icons", () => {
  it.each(tagIcons)("%s has a Lucide icon name and a label", icon => {
    expect(tagIconNames[icon]).toMatch(/^i-lucide-[a-z-]+$/);
    expect(tagIconLabels[icon]).toBeTruthy();
  });

  it("uses the single sparkle, not the AI-style sparkles", () => {
    expect(tagIconNames.sparkle).toBe("i-lucide-sparkle");
    expect(tagIconNames.sparkle).not.toBe("i-lucide-sparkles");
  });
});
