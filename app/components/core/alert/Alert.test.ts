import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import { CoreAlert } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const VARIANT_ICONS = {
  success: "i-heroicons-check-circle",
  error: "i-heroicons-exclamation-circle",
  warning: "i-heroicons-exclamation-triangle",
  info: "i-heroicons-information-circle",
} as const;

describe("CoreAlert", () => {
  it("shows the title and description", async () => {
    const wrapper = await mountSuspended(CoreAlert, {
      props: { variant: "info", title: "Heads up", description: "Something worth knowing." },
    });

    expect(wrapper.text()).toContain("Heads up");
    expect(wrapper.text()).toContain("Something worth knowing.");
  });

  it.each(Object.entries(VARIANT_ICONS))("uses the theme colour and icon for %s", async (variant, icon) => {
    const wrapper = await mountSuspended(CoreAlert, {
      props: { variant: variant as keyof typeof VARIANT_ICONS, title: "Title" },
    });
    const alert = wrapper.findComponent({ name: "UAlert" });

    expect(alert.props("color")).toBe(variant);
    expect(alert.props("variant")).toBe("subtle");
    expect(alert.props("icon")).toBe(icon);
  });

  it("lets the caller replace the icon", async () => {
    const wrapper = await mountSuspended(CoreAlert, {
      props: { variant: "info", title: "Title", icon: "i-heroicons-gift" },
    });

    expect(wrapper.findComponent({ name: "UAlert" }).props("icon")).toBe("i-heroicons-gift");
  });

  it("runs an action when it's clicked", async () => {
    const onClick = vi.fn();
    const wrapper = await mountSuspended(CoreAlert, {
      props: { variant: "warning", title: "Title", actions: [{ label: "Delete", onClick }] },
    });

    await wrapper.find("button").trigger("click");

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is accessible in every variant", async () => {
    for (const variant of Object.keys(VARIANT_ICONS) as (keyof typeof VARIANT_ICONS)[]) {
      const wrapper = await mountSuspended(CoreAlert, {
        props: { variant, title: "Title", description: "Description", actions: [{ label: "Action" }] },
      });
      await expectAccessible(wrapper);
    }
  });
});
