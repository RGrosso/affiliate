import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CollectionToolbar } from "#components";
import type { ProductSort, TagFacet } from "#shared/types/collection";
import { expectAccessible } from "~~/test/nuxt/axe";

const sortOptions: { label: string; value: ProductSort }[] = [
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "price-asc" },
];

const tags: TagFacet[] = [{ id: "t1", name: "Gifts", slug: "gifts", icon: null, tooltip: null, count: 3 }];

const mountToolbar = (props: Record<string, unknown> = {}) =>
  mountSuspended(CollectionToolbar, { props: { total: 24, sort: "newest", sortOptions, tags, ...props } });

describe("CollectionToolbar", () => {
  it("shows the product count", async () => {
    expect((await mountToolbar()).text()).toContain("24 products");
    expect((await mountToolbar({ total: 1 })).text()).toContain("1 product");
    expect((await mountToolbar({ total: 1 })).text()).not.toContain("1 products");
    expect((await mountToolbar({ total: 0 })).text()).toContain("0 products");
  });

  it("shows the selected sort", async () => {
    const wrapper = await mountToolbar({ sort: "price-asc" });

    expect(wrapper.get("button[aria-label='Sort by']").text()).toBe("Price: low to high");
  });

  it("shows the tag select with All when nothing is chosen, and the chosen tag otherwise", async () => {
    expect((await mountToolbar()).get("button[aria-label='Filter by tag']").text()).toBe("All");
    expect((await mountToolbar({ tag: "gifts" })).get("button[aria-label='Filter by tag']").text()).toBe("Gifts");
  });

  it("hides the tag select when there are no tags", async () => {
    const wrapper = await mountToolbar({ tags: [] });

    expect(wrapper.find("button[aria-label='Filter by tag']").exists()).toBe(false);
    expect(wrapper.find("button[aria-label='Sort by']").exists()).toBe(true);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountToolbar({ tag: "gifts" }));
  });
});
