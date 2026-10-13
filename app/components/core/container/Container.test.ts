import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CoreContainer } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const slots = { default: () => "Content" };

describe("CoreContainer", () => {
  it("wraps content at page width by default", async () => {
    const wrapper = await mountSuspended(CoreContainer, { slots });

    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toContain("max-w-(--ui-container)");
    expect(wrapper.classes()).not.toContain("py-8");
    expect(wrapper.text()).toBe("Content");
  });

  it("adds vertical spacing when padded", async () => {
    const wrapper = await mountSuspended(CoreContainer, { props: { variant: "padded" }, slots });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(["max-w-(--ui-container)", "py-8", "sm:py-14"]));
  });

  it("renders a full-width band with page-width content inside", async () => {
    const wrapper = await mountSuspended(CoreContainer, {
      props: { variant: "full", as: "section" },
      attrs: { class: "bg-band" },
      slots,
    });

    expect(wrapper.element.tagName).toBe("SECTION");
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["w-full", "bg-band"]));
    expect(wrapper.classes()).not.toContain("max-w-(--ui-container)");
    expect(wrapper.find("div").classes()).toContain("max-w-(--ui-container)");
  });

  it("renders the element it's given", async () => {
    const wrapper = await mountSuspended(CoreContainer, { props: { as: "main" }, slots });

    expect(wrapper.element.tagName).toBe("MAIN");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(CoreContainer, { props: { variant: "full" }, slots }));
  });
});
