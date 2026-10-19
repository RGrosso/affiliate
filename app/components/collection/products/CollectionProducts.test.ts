import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectionProducts } from "#components";
import type { ProductListItem } from "#shared/types/product";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountWithModel } from "~~/test/nuxt/mount";

const product = (id: string, title: string, pricePence: number | null = 1999): ProductListItem => ({
  id,
  title,
  handle: id,
  description: null,
  pricePence,
  retailer: null,
  affiliateUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  image: null,
  tags: [],
});

const lamp = product("lamp", "Moon Lamp");
const mug = product("mug", "Blue Mug", null);
const kettle = product("kettle", "Steel Kettle", 3500);

registerEndpoint("/api/products", () => ({ success: true, data: { items: [lamp, mug, kettle], total: 3, page: 1, pageSize: 8, totalPages: 1 } }));

const dialog = () => document.body.querySelector<HTMLElement>("[role=dialog]");

describe("CollectionProducts", () => {
  afterEach(() => {
    dialog()?.querySelector<HTMLButtonElement>("button[aria-label=Close]")?.click();
  });

  it("lists the products in the order they were added, with their prices", async () => {
    const { wrapper } = await mountWithModel(CollectionProducts, [lamp, mug]);

    expect(wrapper.findAll("ul[aria-label='Products in this collection'] > li").map(li => li.text())).toEqual(["Moon Lamp£19.99", "Blue Mug"]);
    expect(wrapper.text()).toContain("Products (2)");
  });

  it("is accessible", async () => {
    const { wrapper } = await mountWithModel(CollectionProducts, [lamp, mug]);

    await expectAccessible(wrapper);
  });

  it("explains an empty collection", async () => {
    const { wrapper } = await mountWithModel(CollectionProducts, []);

    expect(wrapper.text()).toContain("No products yet.");
    expect(wrapper.find("ul[aria-label='Products in this collection']").exists()).toBe(false);
  });

  it("removes a product", async () => {
    const { wrapper, model } = await mountWithModel(CollectionProducts, [lamp, mug]);

    await wrapper.get("button[aria-label='Remove Moon Lamp']").trigger("click");

    expect(model.value.map(item => item.id)).toEqual(["mug"]);
  });

  it("adds the products chosen in the dialog after the existing ones", async () => {
    const { wrapper, model } = await mountWithModel(CollectionProducts, [lamp]);

    await wrapper
      .findAll("button")
      .find(button => button.text() === "Add products")!
      .trigger("click");
    await vi.waitFor(() => expect(dialog()?.querySelectorAll("button[role=checkbox]")).toHaveLength(3));
    const boxes = [...dialog()!.querySelectorAll<HTMLButtonElement>("button[role=checkbox]")];
    expect(boxes[0]!.disabled).toBe(true);
    boxes[2]!.click();
    boxes[1]!.click();
    await nextTick();
    [...dialog()!.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.trim() === "Add 2 products")!.click();

    await vi.waitFor(() => expect(model.value.map(item => item.id)).toEqual(["lamp", "kettle", "mug"]));
  });
});
