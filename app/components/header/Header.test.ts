import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const auth = vi.hoisted(() => ({
  user: { value: null as { username: string } | null },
  isAdmin: { value: false },
  logout: vi.fn(),
}));

mockNuxtImport("useAuth", () => () => ({
  user: computed(() => auth.user.value),
  isAdmin: computed(() => auth.isAdmin.value),
  logout: auth.logout,
}));

describe("Header", () => {
  beforeEach(() => {
    auth.user.value = null;
    auth.isAdmin.value = false;
  });

  it("shows the site name, search, category links and colour mode button", async () => {
    const wrapper = await mountSuspended(Header);

    expect(wrapper.text()).toContain(SITE_NAME);
    expect(wrapper.find("form[role=search]").exists()).toBe(true);
    expect(wrapper.get("nav[aria-label=Categories]").text()).toContain("Silly stuff");
    expect(wrapper.find("button[aria-label*='mode']").exists()).toBe(true);
  });

  it("offers a log in link when logged out", async () => {
    const wrapper = await mountSuspended(Header);
    const login = wrapper.findAll("a").find(link => link.text() === "Log in");

    expect(login?.attributes("href")).toBe("/login");
  });

  it("shows the user's menu when logged in", async () => {
    auth.user.value = { username: "admin" };
    const wrapper = await mountSuspended(Header);

    expect(wrapper.text()).toContain("admin");
    expect(wrapper.findAll("a").some(link => link.text() === "Log in")).toBe(false);
  });

  it("shows only the logo, colour mode and account menu on minimal pages such as /admin", async () => {
    const route = useRoute();
    route.meta.minimalHeader = true;
    auth.user.value = { username: "admin" };

    try {
      const wrapper = await mountSuspended(Header);

      expect(wrapper.text()).toContain(SITE_NAME);
      expect(wrapper.text()).toContain("admin");
      expect(wrapper.find("button[aria-label*='mode']").exists()).toBe(true);
      expect(wrapper.text()).not.toContain("Gift ideas for humans");
      expect(wrapper.find("form[role=search]").exists()).toBe(false);
      expect(wrapper.find("nav[aria-label=Categories]").exists()).toBe(false);
    } finally {
      delete route.meta.minimalHeader;
    }
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(Header));
  });
});
