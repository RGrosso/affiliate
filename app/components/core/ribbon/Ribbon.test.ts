import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CoreRibbon } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

describe("CoreRibbon", () => {
  it("shows its label", async () => {
    const wrapper = await mountSuspended(CoreRibbon, { props: { label: "Preview" } });

    expect(wrapper.text()).toBe("Preview");
  });

  it("sits in the top-left corner without blocking clicks", async () => {
    const wrapper = await mountSuspended(CoreRibbon, { props: { label: "Preview" } });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(["absolute", "top-0", "left-0", "pointer-events-none", "overflow-hidden"]));
    expect(wrapper.get("span").classes()).toContain("-rotate-45");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(CoreRibbon, { props: { label: "Preview" } }));
  });
});
