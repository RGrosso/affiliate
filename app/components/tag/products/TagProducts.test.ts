import { describe, expect, it } from "vitest";
import { TagProducts } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountInApp } from "~~/test/nuxt/mount";

const products = [
  { id: "p1", title: "Moon Lamp", retailer: "Amazon", image: null },
  { id: "p2", title: "Desk Plant", retailer: null, image: { url: "/plant.jpg", alt: "A plant" } },
];

describe("TagProducts", () => {
  it("links each product to its edit page", async () => {
    const wrapper = await mountInApp(TagProducts, { slug: "gifts", products, total: 2, pageSize: 20 });

    const link = wrapper.findAll("a").find(a => a.text() === "Moon Lamp");
    expect(link?.attributes("href")).toBe("/admin/products/p1");
    expect(wrapper.text()).toContain("Amazon");
    expect(wrapper.text()).toContain("No retailer");
    expect(wrapper.get("img").attributes("alt")).toBe("A plant");
  });

  it("links to the products list filtered by the tag", async () => {
    const wrapper = await mountInApp(TagProducts, { slug: "gifts", products, total: 2, pageSize: 20 });

    const link = wrapper.findAll("a").find(a => a.text() === "View in products list");
    expect(link?.attributes("href")).toBe("/admin/products?tag=gifts");
  });

  it("explains how to tag a product when there are none", async () => {
    const wrapper = await mountInApp(TagProducts, { slug: "gifts", products: [], total: 0, pageSize: 20 });

    expect(wrapper.text()).toContain("No products have this tag yet. Add it from a product's Tags card.");
    expect(wrapper.text()).not.toContain("View in products list");
  });

  it("shows page controls when there is more than one page", async () => {
    const wrapper = await mountInApp(TagProducts, { slug: "gifts", products, total: 45, pageSize: 2 });

    expect(wrapper.findComponent({ name: "UPagination" }).exists()).toBe(true);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountInApp(TagProducts, { slug: "gifts", products, total: 2, pageSize: 20 }));
    await expectAccessible(await mountInApp(TagProducts, { slug: "gifts", products: [], total: 0, pageSize: 20 }));
  });
});
