import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { AdminContainer } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

describe("AdminContainer", () => {
  it("shows the heading, actions and content", async () => {
    const wrapper = await mountSuspended(AdminContainer, {
      props: { heading: "Products" },
      slots: {
        actions: () => h("button", "Add product"),
        default: () => "Product list",
      },
    });

    expect(wrapper.get("h1").text()).toBe("Products");
    expect(wrapper.get("button").text()).toBe("Add product");
    expect(wrapper.text()).toContain("Product list");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(AdminContainer, { props: { heading: "Products" } }));
  });
});
