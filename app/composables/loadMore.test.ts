import { getQuery } from "h3";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadMore } from "./loadMore";

const ALL = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
let failPage: number | null = null;
// Pretends a product was added at the top after page 1 loaded, so later pages start one item earlier
let shifted = false;

registerEndpoint("/api/load-more", event => {
  const query = getQuery(event);
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  if (page === failPage) throw new Error("Down");
  const start = (page - 1) * pageSize - (shifted && page > 2 ? 1 : 0);
  // ?only=even keeps the even ids, to check that a changed query starts again
  const source = query.only === "even" ? ALL.filter(item => item.id % 2 === 0) : ALL;

  return {
    success: true,
    data: {
      items: source.slice(start, start + pageSize),
      page,
      pageSize,
      total: source.length,
      totalPages: Math.ceil(source.length / pageSize),
      ...(page === 1 && { facets: { evens: 12 } }),
    },
  };
});

async function loaded(options: Parameters<typeof useLoadMore>[1]) {
  const list = await useLoadMore<{ id: number }, { facets: { evens: number } }>("/api/load-more", options);
  await vi.waitUntil(() => list.status.value === "success");
  return list;
}

describe("useLoadMore", () => {
  beforeEach(() => {
    failPage = null;
    shifted = false;
    clearNuxtData();
  });

  it("starts with the first page", async () => {
    const list = await loaded({ pageSize: 10 });

    expect(list.items.value.map(item => item.id)).toEqual(ALL.slice(0, 10).map(item => item.id));
    expect(list.canLoadMore.value).toBe(true);
  });

  it("appends pages until the last one", async () => {
    const list = await loaded({ pageSize: 10 });

    await list.loadMore();
    expect(list.items.value).toHaveLength(20);
    await list.loadMore();
    expect(list.items.value).toHaveLength(25);
    expect(list.canLoadMore.value).toBe(false);

    await list.loadMore();
    expect(list.items.value).toHaveLength(25);
  });

  it("doesn't repeat an item when a later page overlaps an earlier one", async () => {
    const list = await loaded({ pageSize: 10 });

    await list.loadMore();
    shifted = true;
    await list.loadMore();

    const ids = list.items.value.map(item => item.id);
    expect(ids).toEqual(ALL.map(item => item.id));
  });

  it("stops loading more after a page fails", async () => {
    failPage = 2;
    const list = await loaded({ pageSize: 10 });

    await list.loadMore();
    expect(list.items.value).toHaveLength(10);
    expect(list.canLoadMore.value).toBe(false);
    expect(list.loadingMore.value).toBe(false);
  });

  it("exposes extra fields from the first response", async () => {
    const list = await loaded({ pageSize: 10 });

    expect(list.firstPage.value?.facets).toEqual({ evens: 12 });
  });

  it("sends the query with every page", async () => {
    const list = await loaded({ pageSize: 5, query: { only: "even" } });

    await list.loadMore();
    expect(list.items.value.map(item => item.id)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  });

  it("refetches page 1 and drops loaded pages when the query changes", async () => {
    const only = ref<string | undefined>(undefined);
    const list = await loaded({ pageSize: 10, query: () => ({ only: only.value }) });
    await list.loadMore();
    expect(list.items.value).toHaveLength(20);

    only.value = "even";
    await vi.waitUntil(() => list.items.value.length === 10 && list.status.value === "success");
    expect(list.items.value.every(item => item.id % 2 === 0)).toBe(true);
    expect(list.canLoadMore.value).toBe(true);

    await list.loadMore();
    expect(list.items.value).toHaveLength(12);
    expect(list.canLoadMore.value).toBe(false);
  });

  it("recovers from a failed page when the query changes", async () => {
    failPage = 2;
    const only = ref<string | undefined>(undefined);
    const list = await loaded({ pageSize: 10, query: () => ({ only: only.value }) });
    await list.loadMore();
    expect(list.canLoadMore.value).toBe(false);

    failPage = null;
    only.value = "even";
    await vi.waitUntil(() => list.canLoadMore.value);
  });
});
