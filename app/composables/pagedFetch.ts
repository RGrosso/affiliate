import type { ApiSuccess } from "#shared/types/api";
import type { PagedResult } from "#shared/types/pagination";
import { DEFAULT_PAGE_SIZE } from "#shared/schemas/pagination.schema";

type PagedFetchOptions = {
  pageSize?: number;
  /**
   * Extra query params, such as a filter. Changing any of them resets to page 1.
   * To keep a filter in the URL, derive it from the route query (e.g. `() => ({ tag: route.query.tag })`).
   */
  query?: MaybeRefOrGetter<Record<string, string | number | undefined>>;
};

export async function usePagedFetch<T, Extra extends object = object>(
  url: string,
  options: PagedFetchOptions = {}
) {
  const route = useRoute();
  const router = useRouter();

  const page = computed({
    get() {
      const value = Number(Array.isArray(route.query.page) ? route.query.page[0] : route.query.page);
      return Number.isInteger(value) && value >= 1 ? value : 1;
    },
    set(value: number) {
      const { page: _page, ...rest } = route.query;
      router.replace({ query: value > 1 ? { ...rest, page: String(value) } : rest });
    },
  });

  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const extraQuery = computed(() => toValue(options.query) ?? {});

  // Fetches are triggered by hand below: watching the query would fetch the new filter on the
  // old page first, then again once the page resets.
  // Not awaited yet: watchers made after an `await` lose the component's scope and are never stopped.
  const request = useFetch<ApiSuccess<PagedResult<T> & Extra>>(url, {
    query: computed(() => ({ ...extraQuery.value, page: page.value, pageSize })),
    watch: false,
  });
  const { data, status, refresh, error } = request;

  watch(page, () => refresh());

  watch(extraQuery, () => {
    if (page.value === 1) refresh();
    else page.value = 1;
  }, { deep: true });

  // A stale link or a delete can leave the page past the end, which would look like an empty list
  watch(data, (result) => {
    const last = result?.data.totalPages ?? 0;
    if (last > 0 && page.value > last) page.value = last;
  }, { immediate: true });

  const paged = {
    data: computed(() => data.value?.data),
    items: computed(() => data.value?.data.items ?? []),
    total: computed(() => data.value?.data.total ?? 0),
    page,
    pageSize,
    totalPages: computed(() => data.value?.data.totalPages ?? 0),
    status,
    refresh,
    error,
  };

  await request;

  return paged;
}
