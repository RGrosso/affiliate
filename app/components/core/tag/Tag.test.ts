import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CoreTag } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

describe("CoreTag", () => {
  it("shows the label as a small subtle badge, neutral by default", async () => {
    const wrapper = await mountSuspended(CoreTag, { props: { label: "Sample" } });
    const badge = wrapper.findComponent({ name: "UBadge" });

    expect(wrapper.text()).toBe("Sample");
    expect(badge.props()).toMatchObject({ color: "neutral", variant: "subtle", size: "sm" });
  });

  it("uses the colour it's given", async () => {
    const wrapper = await mountSuspended(CoreTag, { props: { label: "Sample", color: "warning" } });

    expect(wrapper.findComponent({ name: "UBadge" }).props("color")).toBe("warning");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(CoreTag, { props: { label: "Sample", color: "warning" } }));
  });
});
