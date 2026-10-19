import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import { getQuery } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionProductPicker, UApp } from "#components";
import type { ProductListItem } from "#shared/types/product";
import { expectAccessible } from "~~/test/nuxt/axe";

const product = (id: string, title: string, pricePence: number | null = 1999, retailer: string | null = "Amazon"): ProductListItem => ({
  id,
  title,
  handle: id,
  description: null,
  pricePence,
  retailer,
  affiliateUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  image: null,
  tags: [],
});

const widgets = Array.from({ length: 60 }, (_, i) => product(`widget-${i + 1}`, `Widget ${String(i + 1).padStart(2, "0")}`));
const catalogue = [product("lamp", "Moon Lamp"), product("mug", "Blue Mug", 850, null), product("kettle", "Steel Kettle", null), ...widgets];
const queries = vi.hoisted(() => [] as Record<string, unknown>[]);

registerEndpoint("/api/products", async event => {
  const query = getQuery(event);
  // Later pages are slow enough for the loading indicator to be seen
  if (query.page !== "1") await new Promise(resolve => setTimeout(resolve, 150));
  queries.push(query);
  const q = String(query.q ?? "").toLowerCase();
  const matches = catalogue.filter(item => item.title.toLowerCase().includes(q));
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  const items = matches.slice((page - 1) * pageSize, page * pageSize);
  return { success: true, data: { items, total: matches.length, page, pageSize, totalPages: Math.ceil(matches.length / pageSize) } };
});

const dialog = () => document.body.querySelector<HTMLElement>("[role=dialog]");
const rows = () => [...(dialog()?.querySelectorAll("ul[aria-label=Products] > li") ?? [])].map(li => li.textContent?.replace(/\s+/g, " ").trim());
const checkbox = (title: string) =>
  [...dialog()!.querySelectorAll<HTMLButtonElement>("button[role=checkbox]")].find(box => box.closest("li")?.textContent?.includes(title))!;
const button = (label: string) => [...dialog()!.querySelectorAll<HTMLButtonElement>("button")].find(el => el.textContent?.trim().startsWith(label))!;

async function typeSearch(text: string) {
  const input = dialog()!.querySelector<HTMLInputElement>("input[aria-label='Search products']")!;
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

// Unmounted after each test so a dialog left open can't be found by the next one
const mounted: { unmount: () => void }[] = [];

async function openPicker(props: Record<string, unknown> = {}) {
  const app = await mountSuspended({
    render: () => h(UApp, null, { default: () => h(CollectionProductPicker, { open: true, addedIds: [], ...props }) }),
  });
  mounted.push(app);
  const wrapper = app.findComponent(CollectionProductPicker);
  await vi.waitFor(() => expect(rows().length).toBeGreaterThanOrEqual(8));
  return wrapper;
}

describe("CollectionProductPicker", () => {
  beforeEach(() => {
    queries.length = 0;
  });

  afterEach(() => {
    mounted.splice(0).forEach(app => app.unmount());
  });

  it("lists the products with their retailer and price", async () => {
    await openPicker();

    expect(rows().slice(0, 3)).toEqual(["Moon LampAmazon · £19.99", "Blue Mug£8.50", "Steel KettleAmazon"]);
  });

  it("is accessible", async () => {
    await openPicker();

    // The dialog is teleported out of the component, so check it where it is
    await expectAccessible({ element: dialog() } as unknown as VueWrapper);
  });

  it("searches products by title after the typing settles", async () => {
    await openPicker();
    queries.length = 0;

    await typeSearch("mug");

    await vi.waitFor(() => expect(rows()).toEqual(["Blue Mug£8.50"]));
    // Pages of the unfiltered list may still be arriving
    const searches = queries.filter(query => query.q === "mug");
    expect(searches).toHaveLength(1);
    expect(searches[0]).toMatchObject({ page: "1" });
  });

  describe("infinite loading", () => {
    const scroller = () => dialog()!.querySelector<HTMLElement>("ul[aria-label=Products]")!.parentElement!;
    // A short window, so the list overflows however tall the test browser is
    const scrollToEnd = async () => {
      scroller().style.maxHeight = "150px";
      scroller().scrollTo({ top: scroller().scrollHeight });
      await nextTick();
    };

    it("loads the next page when the list is scrolled near the end", async () => {
      await openPicker();
      const before = rows().length;

      await scrollToEnd();

      await vi.waitFor(() => expect(rows().length).toBeGreaterThan(before));
      const pages = queries.map(q => Number(q.page));
      expect(pages).toEqual(pages.map((_, i) => i + 1));
    });

    it("stops at the last page and doesn't load a page twice", async () => {
      await openPicker();
      // "widget 1" matches Widget 10 to 19: two pages of 8
      await typeSearch("widget 1");
      await vi.waitFor(() => expect(rows()[0]).toContain("Widget 10"));
      await scrollToEnd();
      await vi.waitFor(() => expect(rows()).toHaveLength(10));
      queries.length = 0;

      await scrollToEnd();
      await scrollToEnd();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(rows()).toHaveLength(10);
      expect(queries).toHaveLength(0);
    });

    it("has no page controls or load more button", async () => {
      await openPicker();

      expect(dialog()!.querySelector("nav[aria-label*=agination]")).toBeNull();
      expect(button("Load more")).toBeUndefined();
    });

    it("starts again from page 1 for a new search", async () => {
      await openPicker();
      await scrollToEnd();
      await vi.waitFor(() => expect(queries.length).toBeGreaterThan(1));
      queries.length = 0;

      await typeSearch("widget 2");

      await vi.waitFor(() => expect(rows()[0]).toContain("Widget 20"));
      expect(queries.find(query => query.q === "widget 2")).toMatchObject({ page: "1" });
      await scrollToEnd();
      await vi.waitFor(() => expect(rows()).toHaveLength(10));
      expect(queries.at(-1)).toMatchObject({ q: "widget 2", page: "2" });
    });

    it("shows a loading indicator while the next page loads", async () => {
      await openPicker();

      await scrollToEnd();

      await vi.waitFor(() => expect(dialog()!.querySelector("[role=status]")).not.toBeNull());
      await vi.waitFor(() => expect(dialog()!.querySelector("[role=status]")).toBeNull());
    });
  });

  it("says when nothing matches", async () => {
    await openPicker();

    await typeSearch("zzz");

    await vi.waitFor(() => expect(dialog()!.textContent).toContain("No products match that search."));
  });

  it("adds the ticked products, including ones ticked in an earlier search", async () => {
    const wrapper = await openPicker();
    expect(button("Add products").disabled).toBe(true);

    checkbox("Moon Lamp").click();
    await nextTick();
    await typeSearch("mug");
    await vi.waitFor(() => expect(rows()).toEqual(["Blue Mug£8.50"]));
    checkbox("Blue Mug").click();
    await nextTick();
    expect(button("Add 2 products").disabled).toBe(false);

    button("Add 2 products").click();
    await nextTick();

    const [added] = wrapper.emitted("add")!.at(-1) as [ProductListItem[]];
    expect(added.map(item => item.id)).toEqual(["lamp", "mug"]);
    expect(wrapper.emitted("update:open")!.at(-1)).toEqual([false]);
  });

  it("shows products already in the collection as added and can't be chosen again", async () => {
    await openPicker({ addedIds: ["mug"] });

    const box = checkbox("Blue Mug");
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(box.disabled).toBe(true);
    expect(rows()[1]).toContain("Already in this collection");
  });

  it("closes without adding anything on cancel", async () => {
    const wrapper = await openPicker();
    checkbox("Moon Lamp").click();
    await nextTick();

    button("Cancel").click();
    await nextTick();

    expect(wrapper.emitted("add")).toBeUndefined();
    expect(wrapper.emitted("update:open")!.at(-1)).toEqual([false]);
  });
});
