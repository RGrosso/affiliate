import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { ProductGallery } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const images = [
  { url: "/a.jpg", alt: "Front" },
  { url: "/b.jpg", alt: null },
  { url: "/c.jpg", alt: "Back" },
];

const mountGallery = (props: Partial<InstanceType<typeof ProductGallery>["$props"]> = {}) =>
  mountSuspended(ProductGallery, { props: { images, title: "Moon Lamp", ...props } });

const mainSrc = (wrapper: Awaited<ReturnType<typeof mountGallery>>) => wrapper.get("[data-main]").attributes("src");
const thumbs = (wrapper: Awaited<ReturnType<typeof mountGallery>>) => wrapper.findAll("button[aria-label^='Show image']");

describe("ProductGallery", () => {
  it("shows the first image with a thumbnail for each", async () => {
    const wrapper = await mountGallery();

    expect(mainSrc(wrapper)).toBe("/a.jpg");
    expect(wrapper.get("[data-main]").attributes("alt")).toBe("Front");
    expect(thumbs(wrapper)).toHaveLength(3);
    expect(thumbs(wrapper)[0]!.attributes("aria-current")).toBe("true");
  });

  it("greys out every thumbnail but the active one", async () => {
    const wrapper = await mountGallery();

    expect(thumbs(wrapper).map(thumb => thumb.classes().includes("grayscale"))).toEqual([false, true, true]);
  });

  it("switches the main image from a thumbnail", async () => {
    const wrapper = await mountGallery();

    await thumbs(wrapper)[1]!.trigger("click");

    expect(mainSrc(wrapper)).toBe("/b.jpg");
    expect(wrapper.get("[data-main]").attributes("alt")).toBe("Moon Lamp");
    expect(thumbs(wrapper)[1]!.attributes("aria-current")).toBe("true");
    expect(thumbs(wrapper)[0]!.classes()).toContain("grayscale");
  });

  it("slides the strip of images to the chosen one, hiding the others from screen readers", async () => {
    const wrapper = await mountGallery();

    await wrapper.get("button[aria-label='Next image']").trigger("click");

    expect(wrapper.get("[data-main]").element.parentElement!.style.transform).toBe("translateX(-100%)");
    const hidden = wrapper.findAll("img[aria-hidden='true']").filter(img => img.attributes("alt") === "");
    expect(hidden.length).toBeGreaterThanOrEqual(2);
  });

  it("can be focused, so the arrow keys work without picking a button first", async () => {
    const wrapper = await mountGallery();

    expect(wrapper.get("section").attributes("tabindex")).toBe("0");
  });

  it("steps through the images with the arrows and keys, wrapping round", async () => {
    const wrapper = await mountGallery();

    await wrapper.get("button[aria-label='Previous image']").trigger("click");
    expect(mainSrc(wrapper)).toBe("/c.jpg");

    await wrapper.get("button[aria-label='Next image']").trigger("click");
    expect(mainSrc(wrapper)).toBe("/a.jpg");

    await wrapper.get("section").trigger("keydown", { key: "ArrowRight" });
    expect(mainSrc(wrapper)).toBe("/b.jpg");
    expect(wrapper.text()).toContain("Image 2 of 3");
  });

  it("has no thumbnails or arrows for a single image", async () => {
    const wrapper = await mountGallery({ images: [images[0]!] });

    expect(thumbs(wrapper)).toHaveLength(0);
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("shows a placeholder without images", async () => {
    const wrapper = await mountGallery({ images: [] });

    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountGallery());
  });
});
