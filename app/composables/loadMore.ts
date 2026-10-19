import type { ApiSuccess } from "#shared/types/api";
import type { PagedResult } from "#shared/types/pagination";

type Options = {
  pageSize: number;
  /** Extra query parameters. When they change, the list starts again from page 1. */
  query?: MaybeRefOrGetter<Record<string, string | undefined>>;
};

/**
 * A list that starts with one page (fetched during SSR) and appends the next page on `loadMore()`.
 * `Extra` types any other fields the first response carries, such as facets, which are read from `firstPage`.
 */
export async function useLoadMore<T extends { id: string | number }, Extra extends object = Record<never, never>>(
  url: MaybeRefOrGetter<string>,
  { pageSize, query }: Options
) {
  const firstQuery = computed(() => ({ ...toValue(query), page: 1, pageSize }));
  const request = useFetch<ApiSuccess<PagedResult<T> & Partial<Extra>>>(url, { query: firstQuery, lazy: true });
  const { data, status, error } = request;

  const more = ref<T[]>([]) as Ref<T[]>;
  const page = ref(1);
  const loadingMore = ref(false);
  // A failed page ends the list rather than retrying on every scroll
  const failed = ref(false);
  // Bumped when the query changes, so a page still in flight for the old query is dropped
  let generation = 0;

  watch(firstQuery, () => {
    generation++;
    more.value = [];
    page.value = 1;
    failed.value = false;
    loadingMore.value = false;
  });

  const firstPage = computed(() => data.value?.data);

  const items = computed(() => {
    // Products added between pages shift later pages along, which would repeat an item
    const seen = new Set<T["id"]>();
    return [...(firstPage.value?.items ?? []), ...more.value].filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  });

  const canLoadMore = computed(() => status.value === "success" && !failed.value && page.value < (firstPage.value?.totalPages ?? 0));

  async function loadMore() {
    if (!canLoadMore.value || loadingMore.value) return;

    const started = generation;
    loadingMore.value = true;
    try {
      const next = page.value + 1;
      const { data: result } = await $fetch<ApiSuccess<PagedResult<T>>>(toValue(url), { query: { ...toValue(query), page: next, pageSize } });
      if (started !== generation) return;
      more.value = [...more.value, ...result.items];
      page.value = next;
    } catch {
      if (started === generation) failed.value = true;
    } finally {
      if (started === generation) loadingMore.value = false;
    }
  }

  await request;

  return { items, firstPage, status, error, loadingMore, canLoadMore, loadMore };
}
