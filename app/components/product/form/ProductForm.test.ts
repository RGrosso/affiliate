import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
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
};

// UFormField links its label to the input with `for`, so find the input the way a user's screen reader would
const field = (wrapper: VueWrapper, label: string) => {
  const labelEl = wrapper.findAll("label").find(el => el.text().replace("*", "").trim() === label);
  if (!labelEl) throw new Error(`No field labelled "${label}"`);
  return wrapper.get<HTMLInputElement>(`[id="${labelEl.attributes("for")}"]`);
};

describe("ProductForm", () => {
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
});
