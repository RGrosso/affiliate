import type { VueWrapper } from "@vue/test-utils";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "#components";
import type { EditableProduct } from "#shared/types/product";
import { mountInApp } from "~~/test/nuxt/mount";

const product: EditableProduct = {
  id: "p1",
  title: "Moon Lamp",
  description: "<p>Glows.</p>",
  handle: "moon-lamp",
  pricePence: 2499,
  retailer: "Gadget Hub",
  affiliateUrl: "https://example.com/moon-lamp",
  seoTitle: null,
  seoDescription: null,
  images: [],
  tagIds: [],
};

const SALE_ID = "0b6e2f1c-8a4d-4f7e-9c1a-3d5b7e9f1a2b";
const ECO_ID = "5c1d9e3a-2b7f-4a68-8d0e-6f4a2c8b1e90";

const tag = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase(),
  description: null,
  tooltip: null,
  icon: null,
  priority: null,
  showOnCards: true,
  productCount: 0,
});

const patches = vi.hoisted(() => [] as { tagIds?: string[] }[]);

registerEndpoint("/api/tags", () => ({ success: true, data: [tag(SALE_ID, "Sale"), tag(ECO_ID, "Eco")] }));

registerEndpoint("/api/products/p1", {
  method: "PATCH",
  handler: async (event) => {
    // readBody needs Node's Buffer, which the browser test runtime lacks, so read the mock request's body directly
    patches.push(JSON.parse((event.node.req as unknown as { body: string }).body));
    return { success: true };
  },
});

// UFormField links its label to the input with `for`, so find the input the way a user's screen reader would
const field = (wrapper: VueWrapper, label: string) => {
  const labelEl = wrapper.findAll("label").find(el => el.text().replace("*", "").trim() === label);
  if (!labelEl) throw new Error(`No field labelled "${label}"`);
  return wrapper.get<HTMLInputElement>(`[id="${labelEl.attributes("for")}"]`);
};

describe("ProductForm", () => {
  beforeEach(() => {
    patches.length = 0;
  });

  it("asks for a title when an empty product is saved", async () => {
    const wrapper = await mountInApp(ProductForm);

    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("Please give the product a title"));
  });

  it("fills the fields from an existing product, showing the price in pounds", async () => {
    const wrapper = await mountInApp(ProductForm, { product });

    expect(field(wrapper, "Title").element.value).toBe("Moon Lamp");
    expect(field(wrapper, "Retailer").element.value).toBe("Gadget Hub");
    expect(field(wrapper, "Price").element.value).toBe("£24.99");
  });

  it("shows the save bar once something changes", async () => {
    const wrapper = await mountInApp(ProductForm, { product });
    expect(wrapper.find("[role=region]").exists()).toBe(false);

    await field(wrapper, "Title").setValue("Moon Lamp XL");

    expect(wrapper.get("[role=region]").attributes("aria-label")).toBe("Unsaved changes");
  });

  it("has a Tags card, even when the product has no images", async () => {
    const wrapper = await mountInApp(ProductForm, { product });

    expect(wrapper.findAll("h2").map(h => h.text())).toContain("Tags");
    expect(wrapper.findComponent({ name: "TagPicker" }).exists()).toBe(true);
  });

  it("shows the product's existing tags as selected", async () => {
    const wrapper = await mountInApp(ProductForm, { product: { ...product, tagIds: [ECO_ID] } });

    await vi.waitFor(() => expect(wrapper.findComponent({ name: "TagPicker" }).findAll("li").map(li => li.text())).toEqual(["Eco"]));
  });

  it("sends the chosen tags when the product is saved", async () => {
    const wrapper = await mountInApp(ProductForm, { product: { ...product, tagIds: [SALE_ID] } });

    await field(wrapper, "Title").setValue("Moon Lamp XL");
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]!.tagIds).toEqual([SALE_ID]);
  });

  it("sends the remaining tags after one is removed", async () => {
    const wrapper = await mountInApp(ProductForm, { product: { ...product, tagIds: [SALE_ID, ECO_ID] } });

    await vi.waitFor(() => expect(wrapper.find("[aria-label='Remove Eco']").exists()).toBe(true));
    await wrapper.get("[aria-label='Remove Eco']").trigger("click");
    expect(wrapper.get("[role=region]").attributes("aria-label")).toBe("Unsaved changes");

    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]!.tagIds).toEqual([SALE_ID]);
  });
});
