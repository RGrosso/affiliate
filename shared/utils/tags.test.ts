import { describe, expect, it } from "vitest";
import { sortTagsByPriority } from "./tags";

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
    const tags = [{ name: "B", priority: null }, { name: "A", priority: null }];
    sortTagsByPriority(tags);
    expect(tags[0]!.name).toBe("B");
  });
});
