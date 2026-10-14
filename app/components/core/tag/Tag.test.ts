import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CoreTag } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountInApp } from "~~/test/nuxt/mount";

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

  it("shows the icon for its key as the badge's leading icon", async () => {
    const wrapper = await mountSuspended(CoreTag, { props: { label: "Sample", icon: "flame" } });

    expect(wrapper.findComponent({ name: "UBadge" }).props("icon")).toBe("i-lucide-flame");
  });

  it("has no icon or tooltip by default", async () => {
    const wrapper = await mountSuspended(CoreTag, { props: { label: "Sample", icon: null, tooltip: null } });

    expect(wrapper.findComponent({ name: "UBadge" }).props("icon")).toBeUndefined();
    expect(wrapper.findComponent({ name: "UTooltip" }).exists()).toBe(false);
    expect(wrapper.find("[tabindex]").exists()).toBe(false);
  });

  it("wraps the badge in a tooltip and makes it focusable when there is tooltip text", async () => {
    const wrapper = await mountInApp(CoreTag, { label: "Sample", tooltip: "Why it matters" });

    expect(wrapper.findComponent({ name: "UTooltip" }).props("text")).toBe("Why it matters");
    expect(wrapper.find("[tabindex='0']").text()).toBe("Sample");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(CoreTag, { props: { label: "Sample", color: "warning" } }));
  });

  it("is accessible with an icon and a tooltip", async () => {
    await expectAccessible(await mountInApp(CoreTag, { label: "Sample", icon: "trophy", tooltip: "Why it matters" }));
  });
});
