import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { CorePagination } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";

describe("CorePagination", () => {
  it("passes the total and page size to the pagination", async () => {
    const wrapper = await mountSuspended(CorePagination, { props: { page: 2, total: 95, pageSize: 20 } });
    const pagination = wrapper.findComponent({ name: "UPagination" });

    expect(pagination.props()).toMatchObject({ page: 2, total: 95, itemsPerPage: 20 });
  });

  it("renders nothing when everything fits on one page", async () => {
    const wrapper = await mountSuspended(CorePagination, { props: { page: 1, total: 20, pageSize: 20 } });

    expect(wrapper.findComponent({ name: "UPagination" }).exists()).toBe(false);
  });

  it("updates the page model when another page is chosen", async () => {
    const wrapper = await mountSuspended(CorePagination, { props: { page: 1, total: 60, pageSize: 20 } });

    wrapper.findComponent({ name: "UPagination" }).vm.$emit("update:page", 3);

    expect(wrapper.emitted("update:page")?.[0]).toEqual([3]);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountSuspended(CorePagination, { props: { page: 1, total: 60, pageSize: 20 } }));
  });
});
