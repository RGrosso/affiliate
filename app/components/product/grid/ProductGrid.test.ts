import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { ProductGrid } from "#components";
import { PRODUCT_GRID_COLUMNS } from "#shared/utils/pageSize";
import { expectAccessible } from "~~/test/nuxt/axe";

const products = Array.from({ length: 4 }, (_, i) => ({
  id: `p${i}`,
  title: `Product ${i}`,
  handle: `product-${i}`,
  pricePence: 1000 + i,
  image: null,
}));

const mountGrid = (props: Partial<InstanceType<typeof ProductGrid>["$props"]> = {}) =>
  mountSuspended(ProductGrid, { props: { label: "Products", products, ...props } });

describe("ProductGrid", () => {
  it("lists a card per product in a labelled list", async () => {
    const wrapper = await mountGrid();

    expect(wrapper.get("ul").attributes("aria-label")).toBe("Products");
    expect(wrapper.findAll("h3").map(h => h.text())).toEqual(["Product 0", "Product 1", "Product 2", "Product 3"]);
  });

  it("uses two columns on small screens, then three and four", async () => {
    const wrapper = await mountGrid();

    expect(wrapper.get("ul").classes()).toEqual(expect.arrayContaining(["grid-cols-2", "md:grid-cols-3", "lg:grid-cols-4"]));
  });

  it("matches the column counts the page sizes its pages for", async () => {
    const wrapper = await mountGrid();
    const classes = wrapper.get("ul").classes();

    expect(PRODUCT_GRID_COLUMNS.map(count => classes.some(name => name.endsWith(`grid-cols-${count}`)))).toEqual([true, true, true]);
  });

  it("shows skeletons instead of cards while loading", async () => {
    const wrapper = await mountGrid({ loading: true });

    expect(wrapper.findAll("h3")).toHaveLength(0);
    expect(wrapper.findAll("[data-skeleton]")).toHaveLength(8);
    expect(wrapper.get("ul").attributes("aria-busy")).toBe("true");
  });

  it("adds skeletons after the cards while more load", async () => {
    const wrapper = await mountGrid({ loadingMore: true, canLoadMore: true });

    expect(wrapper.findAll("h3")).toHaveLength(4);
    expect(wrapper.findAll("[data-skeleton]")).toHaveLength(4);
  });

  it("shows Load more only when there is more, and asks for it when clicked", async () => {
    const none = await mountGrid();
    expect(none.find("button").exists()).toBe(false);

    const wrapper = await mountGrid({ canLoadMore: true });
    await wrapper.get("button").trigger("click");

    expect(wrapper.get("button").text()).toBe("Load more");
    expect(wrapper.emitted("loadMore")).toHaveLength(1);
  });

  it("disables the button while more are loading", async () => {
    const wrapper = await mountGrid({ canLoadMore: true, loadingMore: true });

    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
  });

  it("says nothing matched when a filter is on", async () => {
    const wrapper = await mountGrid({ products: [], filtered: true });

    expect(wrapper.text()).toContain("No products match. Try another filter.");
    expect(wrapper.find("ul").exists()).toBe(false);
  });

  it("says products are on the way when the collection is empty", async () => {
    const wrapper = await mountGrid({ products: [] });

    expect(wrapper.text()).toContain("New finds are on the way. Check back soon!");
  });

  it("says it couldn't load when there was an error", async () => {
    const wrapper = await mountGrid({ products: [], error: true });

    expect(wrapper.text()).toContain("We couldn't load products right now.");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountGrid({ canLoadMore: true }));
    await expectAccessible(await mountGrid({ products: [], filtered: true }));
  });
});
