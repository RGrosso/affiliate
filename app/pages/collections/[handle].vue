<template>
  <div v-if="collection">
    <CollectionHero :collection="collection" />

    <CoreContainer variant="padded">
      <div class="space-y-8">
        <CollectionToolbar
          v-model:sort="sort"
          v-model:tag="tag"
          :total="firstPage?.total ?? 0"
          :sort-options="sortOptions"
          :tags="firstPage?.facets?.tags"
        />

        <ProductGrid
          label="Products"
          :products="items"
          :loading="status === 'pending'"
          :loading-more="loadingMore"
          :can-load-more="canLoadMore"
          :filtered="!!tag"
          :error="!!error"
          @load-more="loadMore"
        />
      </div>
    </CoreContainer>
  </div>
</template>

<script setup lang="ts">
import type { ApiSuccess } from "#shared/types/api";
import { CollectionType, type CollectionFacets, type ProductSort, type PublicCollection } from "#shared/types/collection";
import type { ProductListItem } from "#shared/types/product";

// Keyed by handle alone, so changing the sort or tag keeps the page while moving to another collection starts fresh
definePageMeta({ key: route => String(route.params.handle) });

// The server renders the first page without knowing the screen width, so it fills whole rows at every column count
const PAGE_SIZE = rowAlignedPageSize(20, PRODUCT_GRID_COLUMNS);

const route = useRoute();
const router = useRouter();
const handle = String(route.params.handle);
const base = `/api/collections/handle/${encodeURIComponent(handle)}`;

const { data, error: collectionError } = await useFetch<ApiSuccess<PublicCollection>>(base);

if (collectionError.value) {
  const statusCode = collectionError.value.statusCode ?? 500;
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? "We couldn't find that collection" : "We couldn't load this collection",
    fatal: true,
  });
}

const collection = computed(() => data.value?.data);
const isManual = computed(() => collection.value?.type === CollectionType.Manual);
const sortOptions = computed(() => collectionSortOptions(isManual.value));

const queryValue = (value: unknown) => (typeof value === "string" && value ? value : undefined);

// A sort or tag in the URL wins; anything unusable, such as a sort the collection doesn't offer, falls back
const urlSort = computed(() => {
  const value = queryValue(route.query.sort);
  return isProductSort(value, isManual.value) ? value : undefined;
});
const tag = computed({
  get: () => queryValue(route.query.tag),
  set: value => setQuery({ tag: value }),
});
const sort = computed<ProductSort>({
  get: () => urlSort.value ?? collection.value!.defaultSort,
  // The default stays out of the URL so the plain link is the canonical one
  set: value => setQuery({ sort: value === collection.value!.defaultSort ? undefined : value }),
});

// An undefined value removes the parameter from the URL
function setQuery(changes: { sort?: string; tag?: string }) {
  return router.push({ query: { ...route.query, ...changes } });
}

const { items, firstPage, status, error, loadingMore, canLoadMore, loadMore } = await useLoadMore<ProductListItem, { facets: CollectionFacets }>(
  `${base}/products`,
  {
    pageSize: PAGE_SIZE,
    query: () => ({ sort: urlSort.value, tag: tag.value }),
  }
);

const seoDescription = computed(() => collection.value?.seoDescription ?? undefined);

useSeoMeta({
  title: () => collection.value?.seoTitle,
  description: seoDescription,
  ogTitle: () => collection.value?.seoTitle,
  ogDescription: seoDescription,
  ogImage: () => collection.value?.imageUrl ?? undefined,
  twitterCard: () => (collection.value?.imageUrl ? "summary_large_image" : "summary"),
  // An admin previewing a draft shouldn't get it indexed
  robots: () => (collection.value?.isDraft ? "noindex, nofollow" : undefined),
});

const origin = useRequestURL().origin;

useHead({
  script: [
    {
      type: "application/ld+json",
      // Escaping `<` stops a title or description from closing the script tag early
      innerHTML: () => (collection.value ? JSON.stringify(collectionJsonLd(collection.value, items.value, origin)).replace(/</g, "\\u003c") : ""),
    },
  ],
});
</script>
