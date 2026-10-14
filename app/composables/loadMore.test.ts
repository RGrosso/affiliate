import { getQuery } from "h3";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadMore } from "./loadMore";

const ALL = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
let failPage: number | null = null;

registerEndpoint("/api/load-more", (event) => {
  const query = getQuery(event);
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  if (page === failPage) throw new Error("Down");

  return {
    success: true,
    data: {
      items: ALL.slice((page - 1) * pageSize, page * pageSize),
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

  it("stops at the page limit", async () => {
    const list = await loaded({ pageSize: 10, maxPages: 2 });

    await list.loadMore();
    expect(list.items.value).toHaveLength(20);
    expect(list.canLoadMore.value).toBe(false);
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
