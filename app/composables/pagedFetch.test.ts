import { getQuery } from "h3";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { usePagedFetch } from "./pagedFetch";

const ALL = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }));
const requests = vi.hoisted(() => [] as { page: number; pageSize: number; colour?: string; tag?: string[] }[]);

registerEndpoint("/api/things", (event) => {
  const query = getQuery(event);
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  requests.push({ page, pageSize, ...(query.colour ? { colour: String(query.colour) } : {}),
    ...(query.tag ? { tag: [query.tag].flat().map(String) } : {}),
  });
  return {
    success: true,
    data: {
      items: ALL.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: ALL.length,
      totalPages: Math.ceil(ALL.length / pageSize),
      extra: "hello",
    },
  };
});

// Outside a component nothing stops the composable's watchers, so earlier tests would keep
// fetching on later route changes. Each test gets a scope that's stopped afterwards.
let scope = effectScope();
const pagedFetch = (...args: Parameters<typeof usePagedFetch>) =>
  scope.run(() => usePagedFetch<{ id: number }, { extra: string }>(...args))!;

describe("usePagedFetch", () => {
  afterEach(() => scope.stop());

  beforeEach(async () => {
    scope = effectScope();
    requests.length = 0;
    await useRouter().replace({ query: {} });
  });

  it("exposes the items and totals for the first page", async () => {
    const paged = await pagedFetch("/api/things", { pageSize: 20 });

    expect(paged.items.value).toHaveLength(20);
    expect(paged.total.value).toBe(45);
    expect(paged.totalPages.value).toBe(3);
    expect(paged.page.value).toBe(1);
    expect(paged.data.value?.extra).toBe("hello");
    expect(requests[0]).toEqual({ page: 1, pageSize: 20 });
  });

  it("puts the page in the route query and refetches when it changes", async () => {
    const paged = await pagedFetch("/api/things", { pageSize: 20 });

    paged.page.value = 3;
    await vi.waitFor(() => expect(paged.items.value).toHaveLength(5));

    expect(useRoute().query.page).toBe("3");
    expect(paged.items.value[0]).toEqual({ id: 41 });

    paged.page.value = 1;
    await vi.waitFor(() => expect(paged.items.value).toHaveLength(20));

    expect(useRoute().query.page).toBeUndefined();
  });

  it("reads the starting page from the route query", async () => {
    await useRouter().replace({ query: { page: "2" } });

    const paged = await pagedFetch("/api/things", { pageSize: 20 });

    expect(paged.page.value).toBe(2);
    expect(paged.items.value[0]).toEqual({ id: 21 });
  });

  it("moves back to the last page when the page is past the end", async () => {
    await useRouter().replace({ query: { page: "9" } });

    const paged = await pagedFetch("/api/things", { pageSize: 20 });

    await vi.waitFor(() => expect(paged.page.value).toBe(3));
    await vi.waitFor(() => expect(paged.items.value).toHaveLength(5));
  });

  it("resets to page 1 with a single request when a filter changes", async () => {
    await useRouter().replace({ query: { page: "2" } });
    const colour = ref("red");
    const paged = await pagedFetch("/api/things", { pageSize: 20, query: () => ({ colour: colour.value }) });
    requests.length = 0;

    colour.value = "blue";
    await vi.waitFor(() => expect(paged.page.value).toBe(1));
    await vi.waitFor(() => expect(requests).toHaveLength(1));

    expect(requests).toEqual([{ page: 1, pageSize: 20, colour: "blue" }]);
  });

  it("sends an array filter as repeated keys and resets to page 1 when it changes", async () => {
    await useRouter().replace({ query: { page: "2" } });
    const tags = ref(["a", "b"]);
    const paged = await pagedFetch("/api/things", { pageSize: 20, query: () => ({ tag: [...tags.value] }) });
    requests.length = 0;

    tags.value = ["a", "b", "c"];
    await vi.waitFor(() => expect(paged.page.value).toBe(1));
    await vi.waitFor(() => expect(requests).toHaveLength(1));

    expect(requests).toEqual([{ page: 1, pageSize: 20, tag: ["a", "b", "c"] }]);
  });

  it("keeps the page when an array filter is rebuilt with the same values", async () => {
    await useRouter().replace({ query: { page: "2" } });
    const paged = await pagedFetch("/api/things", { pageSize: 20, query: () => ({ tag: ["a"] }) });

    await useRouter().replace({ query: { page: "3" } });
    await vi.waitFor(() => expect(paged.items.value).toHaveLength(5));

    expect(paged.page.value).toBe(3);
  });
});
