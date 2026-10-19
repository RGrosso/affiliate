import type { ApiSuccess } from "#shared/types/api";
import type { PagedResult } from "#shared/types/pagination";

type Options = {
  pageSize: number;
  /** Extra query parameters. When they change, the list starts again from page 1. */
  query?: MaybeRefOrGetter<Record<string, string | undefined>>;
  /** The list only loads while this is true, such as while a modal is open. Turning it off clears the list. */
  enabled?: MaybeRefOrGetter<boolean>;
};

/**
 * A list for small panels (modals, popovers, pickers) that appends the next page when `loadNext()` is called, e.g. from
 * VueUse's `useInfiniteScroll(container, loadNext, { canLoadMore: () => hasMore.value })`. It fetches on the client only.
 * Use `useLoadMore` instead for a full-page list whose first page is rendered on the server.
 */
export function useInfiniteList<T extends { id: string | number }>(url: string, { pageSize, query, enabled = true }: Options) {
  const items = ref<T[]>([]) as Ref<T[]>;
  const page = ref(0);
  const totalPages = ref(0);
  const loading = ref(false);
  const error = ref<unknown>(null);
  // Bumped on every restart, so a page still in flight for the old query is dropped
  let generation = 0;

  const hasMore = computed(() => !error.value && (page.value === 0 || page.value < totalPages.value));

  async function loadNext() {
    if (loading.value || !hasMore.value || !toValue(enabled)) return;

    const started = generation;
    const next = page.value + 1;
    loading.value = true;
    try {
      const { data } = await $fetch<ApiSuccess<PagedResult<T>>>(url, { query: { ...toValue(query), page: next, pageSize } });
      if (started !== generation) return;
      // Items added between pages shift later pages along, which would repeat one
      const seen = new Set(items.value.map(item => item.id));
      items.value = [...items.value, ...data.items.filter(item => !seen.has(item.id))];
      page.value = next;
      totalPages.value = data.totalPages;
    } catch (err) {
      if (started === generation) error.value = err;
    } finally {
      if (started === generation) loading.value = false;
    }
  }

  function restart() {
    generation++;
    items.value = [];
    page.value = 0;
    totalPages.value = 0;
    error.value = null;
    loading.value = false;
  }

  watch(
    [() => toValue(enabled), () => JSON.stringify(toValue(query) ?? {})],
    ([isEnabled]) => {
      restart();
      if (isEnabled) loadNext();
    },
    { immediate: true }
  );

  return { items, loading, error, hasMore, loadNext };
}
