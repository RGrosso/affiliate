import type { VueWrapper } from "@vue/test-utils";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm, UApp } from "#components";
import type { EditableProduct } from "#shared/types/product";
import { readJsonBody } from "~~/test/nuxt/body";

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

registerEndpoint("/api/products", { method: "POST", handler: () => ({ success: true }) });

registerEndpoint("/api/products/p1", {
  method: "PATCH",
  handler: async (event) => {
    patches.push(readJsonBody(event) as { tagIds?: string[] });
    return { success: true };
  },
});

// UFormField links its label to the input with `for`, so find the input the way a user's screen reader would
const field = (wrapper: VueWrapper, label: string) => {
  const labelEl = wrapper.findAll("label").find(el => el.text().replace("*", "").trim() === label);
  if (!labelEl) throw new Error(`No field labelled "${label}"`);
  return wrapper.get<HTMLInputElement>(`[id="${labelEl.attributes("for")}"]`);
};

// Each form registers a router guard, so unmount them or an earlier test's dirty form would prompt in later ones
const apps: { unmount: () => void }[] = [];

async function mountForm(props: Record<string, unknown> = {}) {
  const app = await mountSuspended({
    render: () => h(UApp, null, { default: () => h(ProductForm, props) }),
  });
  apps.push(app);
  return app.findComponent(ProductForm);
}

describe("ProductForm", () => {
  beforeEach(() => {
    patches.length = 0;
  });

  afterEach(() => {
    apps.splice(0).forEach(app => app.unmount());
  });

  it("asks for a title when an empty product is saved", async () => {
    const wrapper = await mountForm();

    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("Please give the product a title"));
  });

  it("fills the fields from an existing product, showing the price in pounds", async () => {
    const wrapper = await mountForm({ product });

    expect(field(wrapper, "Title").element.value).toBe("Moon Lamp");
    expect(field(wrapper, "Retailer").element.value).toBe("Gadget Hub");
    expect(field(wrapper, "Price").element.value).toBe("£24.99");
  });

  it("shows the save bar once something changes", async () => {
    const wrapper = await mountForm({ product });
    expect(wrapper.find("[role=region]").exists()).toBe(false);

    await field(wrapper, "Title").setValue("Moon Lamp XL");

    expect(wrapper.get("[role=region]").attributes("aria-label")).toBe("Unsaved changes");
  });

  it("has a Tags card, even when the product has no images", async () => {
    const wrapper = await mountForm({ product });

    expect(wrapper.findAll("h2").map(h => h.text())).toContain("Tags");
    expect(wrapper.findComponent({ name: "TagPicker" }).exists()).toBe(true);
  });

  it("shows the product's existing tags as selected", async () => {
    const wrapper = await mountForm({ product: { ...product, tagIds: [ECO_ID] } });

    await vi.waitFor(() => expect(wrapper.findComponent({ name: "TagPicker" }).findAll("li").map(li => li.text())).toEqual(["Eco"]));
  });

  it("sends the chosen tags when the product is saved", async () => {
    const wrapper = await mountForm({ product: { ...product, tagIds: [SALE_ID] } });

    await field(wrapper, "Title").setValue("Moon Lamp XL");
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]!.tagIds).toEqual([SALE_ID]);
  });

  it("sends the remaining tags after one is removed", async () => {
    const wrapper = await mountForm({ product: { ...product, tagIds: [SALE_ID, ECO_ID] } });

    await vi.waitFor(() => expect(wrapper.find("[aria-label='Remove Eco']").exists()).toBe(true));
    await wrapper.get("[aria-label='Remove Eco']").trigger("click");
    expect(wrapper.get("[role=region]").attributes("aria-label")).toBe("Unsaved changes");

    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]!.tagIds).toEqual([SALE_ID]);
  });

  describe("leaving with unsaved changes", () => {
    const button = (label: string) =>
      [...document.body.querySelectorAll("button")].find(el => el.textContent?.trim() === label);

    beforeEach(async () => {
      await useRouter().push("/");
    });

    it("asks before leaving once a tag is removed, and stays when the user keeps editing", async () => {
      const wrapper = await mountForm({ product: { ...product, tagIds: [SALE_ID] } });
      await vi.waitFor(() => expect(wrapper.find("[aria-label='Remove Sale']").exists()).toBe(true));
      await wrapper.get("[aria-label='Remove Sale']").trigger("click");

      const navigation = useRouter().push("/products");
      await vi.waitFor(() => expect(button("Yes, leave")).toBeDefined());
      expect(document.body.querySelector("[role=dialog]")!.textContent).toContain("Leave without saving?");
      button("Cancel")!.click();
      await navigation;

      expect(useRouter().currentRoute.value.path).toBe("/");
    });

    it("does not ask when nothing has changed", async () => {
      await mountForm({ product });

      await useRouter().push("/products");

      expect(useRouter().currentRoute.value.path).toBe("/products");
      expect(document.body.querySelector("[role=dialog]")).toBeNull();
    });

    it("does not ask when moving on after a new product is saved", async () => {
      const wrapper = await mountForm();
      await field(wrapper, "Title").setValue("Moon Lamp");
      await field(wrapper, "Retailer").setValue("Gadget Hub");
      await field(wrapper, "Affiliate URL").setValue("https://example.com/moon-lamp");

      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(useRouter().currentRoute.value.path).not.toBe("/"));
      expect(document.body.querySelector("[role=dialog]")).toBeNull();
    });
  });
});
