import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { Footer } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

describe("Footer", () => {
  it("shows the site name, what the site is and the commission notice", async () => {
    const wrapper = await mountSuspended(Footer);

    expect(wrapper.get("footer").text()).toContain(SITE_NAME);
    expect(wrapper.text()).toContain("hand-picked from shops across the internet");
    expect(wrapper.text()).toContain("We may earn a commission, at no cost to you.");
    expect(wrapper.text()).toContain(`© ${formatYear(new Date())} ${SITE_NAME}`);
  });

  it("links the site name home", async () => {
    const wrapper = await mountSuspended(Footer);

    expect(wrapper.get("a").attributes("href")).toBe("/");
  });

  it("is hidden on pages that ask for no footer, such as /admin", async () => {
    const route = useRoute();
    route.meta.hideFooter = true;

    try {
      const wrapper = await mountSuspended(Footer);
      expect(wrapper.find("footer").exists()).toBe(false);
    } finally {
      delete route.meta.hideFooter;
    }
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(Footer));
  });
});
