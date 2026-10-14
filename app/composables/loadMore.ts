import type { ApiSuccess } from "#shared/types/api";
import type { PagedResult } from "#shared/types/pagination";

type LoadMoreOptions = {
  pageSize: number;
  /** Stop after this many pages, even if the list has more. */
  maxPages?: number;
};

/** A list that starts with one page (fetched during SSR) and appends the next page on `loadMore()`. */
export async function useLoadMore<T extends { id: string | number }>(
  url: string,
  { pageSize, maxPages = Infinity }: LoadMoreOptions
) {
  const request = useFetch<ApiSuccess<PagedResult<T>>>(url, {
    query: { page: 1, pageSize },
    lazy: true,
  });
  const { data, status, error } = request;

  const more = ref<T[]>([]) as Ref<T[]>;
  const page = ref(1);
  const loadingMore = ref(false);
  // A failed page ends the list rather than retrying on every scroll
  const failed = ref(false);

  const items = computed(() => {
    const first = data.value?.data.items ?? [];
    // Products added between pages shift later pages along, which would repeat an item
    const seen = new Set(first.map(item => item.id));
    return [...first, ...more.value.filter(item => !seen.has(item.id))];
  });

  const canLoadMore = computed(() =>
    status.value === "success"
    && !failed.value
    && page.value < Math.min(data.value?.data.totalPages ?? 0, maxPages)
  );

  async function loadMore() {
    if (!canLoadMore.value || loadingMore.value) return;

    loadingMore.value = true;
    try {
      const next = page.value + 1;
      const { data: result } = await $fetch<ApiSuccess<PagedResult<T>>>(url, { query: { page: next, pageSize } });
      more.value = [...more.value, ...result.items];
      page.value = next;
    } catch {
      failed.value = true;
    } finally {
      loadingMore.value = false;
    }
  }

  await request;

  return { items, status, error, loadingMore, canLoadMore, loadMore };
}
