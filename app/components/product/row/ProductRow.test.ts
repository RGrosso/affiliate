import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { ProductRow } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const products = Array.from({ length: 3 }, (_, i) => ({
  id: `p${i}`,
  title: `Product ${i}`,
  handle: `product-${i}`,
  pricePence: 1000 + i,
  image: null,
}));

const mountRow = (props: Partial<InstanceType<typeof ProductRow>["$props"]> = {}) =>
  mountSuspended(ProductRow, { props: { label: "Trending", products, viewAllTo: "/collections/all", ...props } });

describe("ProductRow", () => {
  it("lists a card per product in a labelled list", async () => {
    const wrapper = await mountRow();

    expect(wrapper.get("ul").attributes("aria-label")).toBe("Trending");
    expect(wrapper.findAll("h3").map(h => h.text())).toEqual(["Product 0", "Product 1", "Product 2"]);
  });

  it("shows skeletons instead of cards while the first page loads", async () => {
    const wrapper = await mountRow({ loading: true });

    expect(wrapper.findAll("h3")).toHaveLength(0);
    expect(wrapper.findAll("[data-skeleton]")).toHaveLength(5);
    expect(wrapper.get("ul").attributes("aria-busy")).toBe("true");
  });

  it("adds skeletons after the cards while more load", async () => {
    const wrapper = await mountRow({ loadingMore: true, canLoadMore: true });

    expect(wrapper.findAll("h3")).toHaveLength(3);
    expect(wrapper.findAll("[data-skeleton]")).toHaveLength(2);
    expect(wrapper.text()).not.toContain("View all");
  });

  it("ends with a View all card once there's nothing more to load", async () => {
    const more = await mountRow({ canLoadMore: true });
    expect(more.text()).not.toContain("View all");

    const done = await mountRow();
    const viewAll = done.findAll("a").at(-1)!;
    expect(viewAll.text()).toBe("View all");
    expect(viewAll.attributes("href")).toBe("/collections/all");
  });

  it("hides the left scroll button at the start", async () => {
    const wrapper = await mountRow();

    expect(wrapper.get("button[aria-label='Scroll Trending left']").classes()).toContain("invisible");
    expect(wrapper.find("button[aria-label='Scroll Trending right']").exists()).toBe(true);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountRow());
  });
});
