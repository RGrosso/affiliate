import { describe, expect, it } from "vitest";
import type { Tag } from "../types/tag";
import { pickCardTags, sortTagsByPriority } from "./tags";

describe("sortTagsByPriority", () => {
  it("puts the highest priority first, treating no priority as 0, then sorts by name", () => {
    const tags = [
      { name: "Gift", priority: null },
      { name: "New", priority: 1000 },
      { name: "Clearance", priority: -5 },
      { name: "Eco", priority: 0 },
      { name: "Bestseller", priority: 10 },
    ];

    expect(sortTagsByPriority(tags).map(tag => tag.name)).toEqual(["New", "Bestseller", "Eco", "Gift", "Clearance"]);
  });

  it("leaves the original list alone", () => {
    const tags = [
      { name: "B", priority: null },
      { name: "A", priority: null },
    ];
    sortTagsByPriority(tags);
    expect(tags[0]!.name).toBe("B");
  });
});

describe("pickCardTags", () => {
  const tag = (name: string, priority: number | null, showOnCards = true): Tag => ({
    id: name,
    name,
    slug: name.toLowerCase(),
    description: "Admin notes",
    tooltip: null,
    icon: null,
    priority,
    showOnCards,
    showInFilter: false,
  });

  it("keeps up to three tags shown on cards, highest priority first", () => {
    const tags = [tag("Gift", null), tag("Hidden", 5000, false), tag("Eco", 1), tag("Sale", 50), tag("New", 1000)];

    expect(pickCardTags(tags).map(t => t.name)).toEqual(["New", "Sale", "Eco"]);
  });

  it("returns only what a badge needs", () => {
    expect(pickCardTags([tag("New", 1)])).toEqual([{ id: "New", name: "New", slug: "new", icon: null, tooltip: null }]);
  });
});
