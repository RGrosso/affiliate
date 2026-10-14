import { getQuery } from "h3";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadMore } from "./loadMore";

const ALL = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
let failPage: number | null = null;
// Pretends a product was added at the top after page 1 loaded, so later pages start one item earlier
let shifted = false;

registerEndpoint("/api/load-more", (event) => {
  const query = getQuery(event);
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  if (page === failPage) throw new Error("Down");
  const start = (page - 1) * pageSize - (shifted && page > 2 ? 1 : 0);

  return {
    success: true,
    data: {
      items: ALL.slice(start, start + pageSize),
      page,
      pageSize,
      total: ALL.length,
      totalPages: Math.ceil(ALL.length / pageSize),
    },
  };
});

async function loaded(options: Parameters<typeof useLoadMore>[1]) {
  const list = await useLoadMore<{ id: number }>("/api/load-more", options);
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
});
