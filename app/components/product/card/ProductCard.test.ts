import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { ProductCard } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const product = {
  title: "Moon Lamp",
  retailer: "Gadget Hub",
  pricePence: 2499,
  affiliateUrl: "https://example.com/moon-lamp",
  image: { url: "/images/moon-lamp.jpg", alt: "A glowing moon lamp" },
};

describe("ProductCard", () => {
  it("shows the title, retailer and price", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product } });

    expect(wrapper.get("h3").text()).toBe("Moon Lamp");
    expect(wrapper.text()).toContain("Gadget Hub");
    expect(wrapper.text()).toContain("£24.99");
  });

  it("drops .00 from whole-pound prices", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: { ...product, pricePence: 4200 } } });

    expect(wrapper.text()).toContain("£42");
    expect(wrapper.text()).not.toContain("£42.00");
  });

  it("links out to the retailer as a sponsored link in a new tab", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product } });
    const link = wrapper.get("a");

    expect(link.text()).toBe("View");
    expect(link.attributes()).toMatchObject({
      href: "https://example.com/moon-lamp",
      target: "_blank",
      rel: "sponsored noopener noreferrer",
    });
  });

  it("has no link when there's no affiliate URL", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: { ...product, affiliateUrl: null } } });

    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("uses the image alt text, falling back to the title", async () => {
    const withAlt = await mountSuspended(ProductCard, { props: { product } });
    expect(withAlt.get("img").attributes("alt")).toBe("A glowing moon lamp");

    const noAlt = await mountSuspended(ProductCard, {
      props: { product: { ...product, image: { url: "/a.jpg", alt: null } } },
    });
    expect(noAlt.get("img").attributes("alt")).toBe("Moon Lamp");
  });

  it("shows a placeholder when there's no image", async () => {
    const wrapper = await mountSuspended(ProductCard, { props: { product: { ...product, image: null } } });

    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(ProductCard, { props: { product } }));
  });
});
