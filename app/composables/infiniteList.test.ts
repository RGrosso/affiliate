import { getQuery } from "h3";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInfiniteList } from "./infiniteList";

const ALL = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
const requested = vi.hoisted(() => [] as { page: number; only?: string }[]);
let failPage: number | null = null;
// Pretends a product was added at the top after page 1 loaded, so later pages start one item earlier
let shifted = false;
let release: (() => void) | null = null;
let hold = false;

registerEndpoint("/api/infinite", async event => {
  const query = getQuery(event);
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  requested.push({ page, only: query.only as string | undefined });
  if (hold) await new Promise<void>(resolve => (release = resolve));
  if (page === failPage) throw new Error("Down");
  const start = (page - 1) * pageSize - (shifted && page > 1 ? 1 : 0);
  const source = query.only === "even" ? ALL.filter(item => item.id % 2 === 0) : ALL;
  return {
    success: true,
    data: { items: source.slice(start, start + pageSize), page, pageSize, total: source.length, totalPages: Math.ceil(source.length / pageSize) },
  };
});

const ids = (list: { items: { value: { id: number }[] } }) => list.items.value.map(item => item.id);

describe("useInfiniteList", () => {
  beforeEach(() => {
    requested.length = 0;
    failPage = null;
    shifted = false;
    hold = false;
    release = null;
  });

  it("loads the first page straight away", async () => {
    const list = useInfiniteList<{ id: number }>("/api/infinite", { pageSize: 10 });

    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));
    expect(list.hasMore.value).toBe(true);
  });

  it("waits until enabled, and clears when disabled again", async () => {
    const enabled = ref(false);
    const list = useInfiniteList<{ id: number }>("/api/infinite", { pageSize: 10, enabled });
    await nextTick();
    expect(requested).toHaveLength(0);

    enabled.value = true;
    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));

    enabled.value = false;
    await nextTick();
    expect(ids(list)).toEqual([]);
  });

  it("appends each page on loadNext and stops at the last one", async () => {
    const list = useInfiniteList<{ id: number }>("/api/infinite", { pageSize: 10 });
    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));

    await list.loadNext();
    expect(ids(list)).toHaveLength(20);
    await list.loadNext();
    expect(ids(list)).toEqual(ALL.map(item => item.id));
    expect(list.hasMore.value).toBe(false);

    await list.loadNext();
    expect(requested.map(r => r.page)).toEqual([1, 2, 3]);
  });

  it("doesn't fetch the same page twice while one is loading", async () => {
    const list = useInfiniteList<{ id: number }>("/api/infinite", { pageSize: 10 });
    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));

    hold = true;
    const first = list.loadNext();
    const second = list.loadNext();
    await vi.waitFor(() => expect(list.loading.value).toBe(true));
    release?.();
    await Promise.all([first, second]);

    expect(requested.map(r => r.page)).toEqual([1, 2]);
    expect(ids(list)).toHaveLength(20);
  });

  it("starts again from page 1 when the query changes, dropping a page still in flight", async () => {
    const only = ref<string | undefined>(undefined);
    const list = useInfiniteList<{ id: number }>("/api/infinite", { pageSize: 10, query: () => ({ only: only.value }) });
    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));

    hold = true;
    const stale = list.loadNext();
    await vi.waitFor(() => expect(list.loading.value).toBe(true));
    hold = false;
    only.value = "even";
    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));
    release?.();
    await stale;

    expect(ids(list).every(id => id % 2 === 0)).toBe(true);
    expect(requested.at(-1)).toEqual({ page: 1, only: "even" });
  });

  it("doesn't repeat an item when later pages shift along", async () => {
    const list = useInfiniteList<{ id: number }>("/api/infinite", { pageSize: 10 });
    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));

    shifted = true;
    await list.loadNext();

    expect(new Set(ids(list)).size).toBe(ids(list).length);
  });

  it("stops loading after a failure rather than retrying on every scroll", async () => {
    const list = useInfiniteList<{ id: number }>("/api/infinite", { pageSize: 10 });
    await vi.waitFor(() => expect(ids(list)).toHaveLength(10));

    failPage = 2;
    await list.loadNext();
    // $fetch retries a failed GET once itself
    const afterFailure = requested.length;
    await list.loadNext();

    expect(list.error.value).toBeTruthy();
    expect(list.hasMore.value).toBe(false);
    expect(requested).toHaveLength(afterFailure);
    expect(ids(list)).toHaveLength(10);
  });
});
