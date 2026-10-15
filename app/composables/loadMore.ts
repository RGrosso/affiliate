import type { ApiSuccess } from "#shared/types/api";
import type { PagedResult } from "#shared/types/pagination";

/** A list that starts with one page (fetched during SSR) and appends the next page on `loadMore()`. */
export async function useLoadMore<T extends { id: string | number }>(
  url: string,
  { pageSize }: { pageSize: number }
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
    // Products added between pages shift later pages along, which would repeat an item
    const seen = new Set<T["id"]>();
    return [...(data.value?.data.items ?? []), ...more.value].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  });

  const canLoadMore = computed(() =>
    status.value === "success"
    && !failed.value
    && page.value < (data.value?.data.totalPages ?? 0)
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
