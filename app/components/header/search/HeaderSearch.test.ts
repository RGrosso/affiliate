import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderSearch } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

const toast = vi.hoisted(() => {
  let nextId = 0;
  return {
    add: vi.fn(() => ({ id: ++nextId })),
    remove: vi.fn(),
  };
});

mockNuxtImport("useToast", () => () => toast);

describe("HeaderSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearNuxtState("header-search-toast-id");
  });

  it("shows a coming-soon toast when a search is submitted", async () => {
    const wrapper = await mountSuspended(HeaderSearch);

    await wrapper.get("input").setValue("socks");
    await wrapper.get("form").trigger("submit");

    expect(toast.add).toHaveBeenCalledOnce();
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ title: "Search is coming soon" }));
    expect(toast.remove).not.toHaveBeenCalled();
  });

  it("replaces the previous toast instead of stacking them", async () => {
    const wrapper = await mountSuspended(HeaderSearch);

    await wrapper.get("form").trigger("submit");
    const [{ value: first }] = toast.add.mock.results;
    await wrapper.get("form").trigger("submit");

    expect(toast.remove).toHaveBeenCalledWith(first?.id);
    expect(toast.add).toHaveBeenCalledTimes(2);
  });

  it("keeps the text in step between search boxes", async () => {
    const desktop = await mountSuspended(HeaderSearch);
    const mobile = await mountSuspended(HeaderSearch);

    await desktop.get("input").setValue("cat toys");

    expect(mobile.get("input").element.value).toBe("cat toys");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(HeaderSearch));
  });
});
