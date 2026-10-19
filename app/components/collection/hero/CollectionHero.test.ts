import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CollectionHero } from "#components";
import type { PublicCollection } from "#shared/types/collection";
import { expectAccessible } from "~~/test/nuxt/axe";

type HeroCollection = Pick<PublicCollection, "title" | "description" | "imageUrl" | "imageAlt" | "isDraft">;

const collection: HeroCollection = {
  title: "Gifts for cooks",
  description: "Everything for the kitchen.\nAnd then some.",
  imageUrl: "/images/cooks.jpg",
  imageAlt: "A cluttered kitchen counter",
  isDraft: false,
};

const mountHero = (overrides: Partial<HeroCollection> = {}) => mountSuspended(CollectionHero, { props: { collection: { ...collection, ...overrides } } });

describe("CollectionHero", () => {
  it("shows the title and description over the cover image, using its alt text", async () => {
    const wrapper = await mountHero();

    expect(wrapper.get("h1").text()).toBe("Gifts for cooks");
    expect(wrapper.get("p").text()).toContain("Everything for the kitchen.");
    expect(wrapper.get("img").attributes()).toMatchObject({ src: "/images/cooks.jpg", alt: "A cluttered kitchen counter" });
    expect(wrapper.get("img").classes()).toContain("object-cover");
    expect(wrapper.find("[data-scrim]").exists()).toBe(true);
  });

  it("treats an image with no alt text as decorative", async () => {
    const wrapper = await mountHero({ imageAlt: null });

    expect(wrapper.get("img").attributes("alt")).toBe("");
  });

  it("is a plain navy band without an image", async () => {
    const wrapper = await mountHero({ imageUrl: null });

    expect(wrapper.classes()).toContain("bg-band");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("[data-scrim]").exists()).toBe(false);
    expect(wrapper.get("h1").text()).toBe("Gifts for cooks");
  });

  it("leaves out the description when there isn't one", async () => {
    const wrapper = await mountHero({ description: null });

    expect(wrapper.find("p").exists()).toBe(false);
  });

  it("renders the description as plain text", async () => {
    const wrapper = await mountHero({ description: "<b>Bold</b>" });

    expect(wrapper.get("p").text()).toBe("<b>Bold</b>");
    expect(wrapper.find("b").exists()).toBe(false);
  });

  it("flags a draft with a Preview ribbon", async () => {
    expect((await mountHero()).findComponent({ name: "CoreRibbon" }).exists()).toBe(false);

    const draft = await mountHero({ isDraft: true });
    expect(draft.getComponent({ name: "CoreRibbon" }).text()).toBe("Preview");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountHero());
    await expectAccessible(await mountHero({ imageUrl: null, isDraft: true }));
  });
});
