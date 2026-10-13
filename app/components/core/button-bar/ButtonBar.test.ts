import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CoreButtonBar } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const slots = { default: () => h("button", "Save") };

describe("CoreButtonBar", () => {
  it("renders nothing while hidden", async () => {
    const wrapper = await mountSuspended(CoreButtonBar, { props: { show: false }, slots });

    expect(wrapper.find("[role=region]").exists()).toBe(false);
  });

  it("shows the default message and the buttons when shown", async () => {
    const wrapper = await mountSuspended(CoreButtonBar, { props: { show: true }, slots });
    const region = wrapper.get("[role=region]");

    expect(region.attributes("aria-label")).toBe("Unsaved changes");
    expect(region.text()).toContain("Unsaved changes");
    expect(region.find("button").text()).toBe("Save");
  });

  it("uses a custom message", async () => {
    const wrapper = await mountSuspended(CoreButtonBar, {
      props: { show: true, message: "Remove failed uploads before saving" },
      slots,
    });

    expect(wrapper.get("[role=region]").attributes("aria-label")).toBe("Remove failed uploads before saving");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(CoreButtonBar, { props: { show: true }, slots }));
  });
});
