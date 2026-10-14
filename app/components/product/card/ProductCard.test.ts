import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { ProductCard } from "#components";
import type { TagBadge } from "#shared/types/tag";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountInApp } from "~~/test/nuxt/mount";

const product = {
  title: "Moon Lamp",
  retailer: "Gadget Hub",
  pricePence: 2499,
  affiliateUrl: "https://example.com/moon-lamp",
  image: { url: "/images/moon-lamp.jpg", alt: "A glowing moon lamp" },
};

function makeBadge(name: string, overrides: Partial<TagBadge> = {}): TagBadge {
  return { id: name, name, slug: name.toLowerCase(), icon: null, tooltip: null, ...overrides };
}

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

  describe("tags", () => {
    it("shows no tag row without tags", async () => {
      const wrapper = await mountSuspended(ProductCard, { props: { product } });

      expect(wrapper.findAllComponents({ name: "CoreTag" })).toHaveLength(0);
    });

    it("shows the tags it's given", async () => {
      const tags = [makeBadge("New"), makeBadge("Eco")];
      const wrapper = await mountInApp(ProductCard, { product: { ...product, tags } });

      expect(wrapper.findAllComponents({ name: "CoreTag" }).map(tag => tag.text())).toEqual(["New", "Eco"]);
    });

    it("shows at most three tags as a safety net", async () => {
      const tags = ["A", "B", "C", "D", "E"].map(name => makeBadge(name));
      const wrapper = await mountInApp(ProductCard, { product: { ...product, tags } });

      expect(wrapper.findAllComponents({ name: "CoreTag" }).map(tag => tag.text())).toEqual(["A", "B", "C"]);
    });

    it("passes each tag's icon and tooltip to the badge", async () => {
      const tags = [makeBadge("Hot", { icon: "flame", tooltip: "Selling fast" })];
      const wrapper = await mountInApp(ProductCard, { product: { ...product, tags } });
      const tag = wrapper.getComponent({ name: "CoreTag" });

      expect(tag.props()).toMatchObject({ label: "Hot", icon: "flame", tooltip: "Selling fast" });
      expect(wrapper.findComponent({ name: "UBadge" }).props("icon")).toBe("i-lucide-flame");
      expect(wrapper.findComponent({ name: "UTooltip" }).props("text")).toBe("Selling fast");
    });

    it("is accessible with tags", async () => {
      const tags = [makeBadge("New", { icon: "sparkle", tooltip: "Just arrived" }), makeBadge("Eco", { icon: "leaf" })];

      await expectAccessible(await mountInApp(ProductCard, { product: { ...product, tags } }));
    });
  });
});
