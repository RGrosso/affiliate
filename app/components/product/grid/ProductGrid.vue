<template>
  <div class="space-y-8">
    <p
      v-if="showMessage"
      class="py-12 text-center"
    >
      {{ message }}
    </p>

    <ul
      v-else
      :aria-label="label"
      :aria-busy="loading || loadingMore"
      class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
    >
      <template v-if="!loading">
        <li
          v-for="product in products"
          :key="product.id"
        >
          <ProductCard :product="product" />
        </li>
      </template>

      <li
        v-for="i in skeletonCount"
        :key="`skeleton-${i}`"
        aria-hidden="true"
        data-skeleton
      >
        <div class="flex flex-col items-center gap-3">
          <USkeleton class="aspect-square w-full rounded-md" />
          <USkeleton class="h-5 w-3/4" />
          <USkeleton class="h-5 w-1/4" />
        </div>
      </li>
    </ul>

    <div
      v-if="canLoadMore"
      class="flex justify-center"
    >
      <UButton
        label="Load more"
        color="neutral"
        variant="outline"
        size="lg"
        class="px-8"
        :loading="loadingMore"
        @click="emit('loadMore')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductCardData } from "../card/ProductCard.vue";

const {
  label,
  products,
  loading = false,
  loadingMore = false,
  canLoadMore = false,
  filtered = false,
  error = false,
} = defineProps<{
  label: string;
  products: (ProductCardData & { id: string })[];
  loading?: boolean;
  loadingMore?: boolean;
  canLoadMore?: boolean;
  /** A filter is on, so an empty list means nothing matched rather than nothing exists. */
  filtered?: boolean;
  error?: boolean;
}>();

const emit = defineEmits<{
  loadMore: [];
}>();

const skeletonCount = computed(() => (loading ? 8 : loadingMore ? 4 : 0));
const showMessage = computed(() => !loading && !products.length);
const message = computed(() => {
  if (error) return "We couldn't load products right now. Please try again later.";
  return filtered ? "No products match. Try another filter." : "New finds are on the way. Check back soon!";
});
</script>
