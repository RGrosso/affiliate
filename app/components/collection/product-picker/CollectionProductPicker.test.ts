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

const catalogue = [product("lamp", "Moon Lamp"), product("mug", "Blue Mug", 850, null), product("kettle", "Steel Kettle", null)];
const queries = vi.hoisted(() => [] as Record<string, unknown>[]);

registerEndpoint("/api/products", event => {
  const query = getQuery(event);
  queries.push(query);
  const q = String(query.q ?? "").toLowerCase();
  const items = catalogue.filter(item => item.title.toLowerCase().includes(q));
  return { success: true, data: { items, total: items.length, page: 1, pageSize: 8, totalPages: 1 } };
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
  await vi.waitFor(() => expect(rows()).toHaveLength(3));
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

    expect(rows()).toEqual(["Moon LampAmazon · £19.99", "Blue Mug£8.50", "Steel KettleAmazon"]);
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
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({ q: "mug", page: "1" });
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
