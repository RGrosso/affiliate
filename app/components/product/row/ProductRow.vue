<template>
  <div class="space-y-5">
    <div class="flex flex-wrap justify-between items-end gap-3">
      <slot name="header" />

      <!-- ml-auto keeps the actions on the right when they wrap under the header -->
      <div class="ml-auto flex items-center gap-3">
        <slot name="actions" />
        <!-- Left out when everything fits, so the actions sit at the far right -->
        <div
          v-if="scrollable"
          class="hidden lg:flex gap-2"
        >
          <UButton
            icon="i-heroicons-chevron-left"
            color="neutral"
            variant="outline"
            square
            class="rounded-full"
            :aria-label="`Scroll ${label} left`"
            :class="{ invisible: arrivedState.left }"
            @click="scrollByPage(-1)"
          />
          <UButton
            icon="i-heroicons-chevron-right"
            color="neutral"
            variant="outline"
            square
            class="rounded-full"
            :aria-label="`Scroll ${label} right`"
            :class="{ invisible: arrivedState.right }"
            @click="scrollByPage(1)"
          />
        </div>
      </div>
    </div>

    <!-- The padding keeps the cards' focus rings inside the scroll area, which would otherwise clip them -->
    <ul
      ref="scroller"
      :aria-label="label"
      :aria-busy="loading || loadingMore"
      class="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-px-1 p-1 -m-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <template v-if="!loading">
        <li
          v-for="product in products"
          :key="product.id"
          :class="ITEM_CLASS"
        >
          <ProductCard :product="product" />
        </li>
      </template>

      <li
        v-for="i in skeletonCount"
        :key="`skeleton-${i}`"
        :class="ITEM_CLASS"
        aria-hidden="true"
        data-skeleton
      >
        <div class="flex flex-col items-center gap-3">
          <USkeleton class="aspect-square w-full rounded-md" />
          <USkeleton class="h-5 w-3/4" />
          <USkeleton class="h-5 w-1/4" />
        </div>
      </li>

      <li
        v-if="showViewAll"
        :class="ITEM_CLASS"
      >
        <NuxtLink
          :to="viewAllTo"
          class="group aspect-square rounded-md border border-default flex items-center justify-center gap-2 font-bold text-primary hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
        >
          View all
          <UIcon
            name="i-heroicons-arrow-right"
            class="size-5 transition-transform group-hover:translate-x-1"
          />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { VNode } from "vue";
import type { ProductCardData } from "../card/ProductCard.vue";

// About 1.4 cards on a phone, then 2.5, 3.3 and 5 across on wider screens (gap-5 is 1.25rem)
const ITEM_CLASS = "shrink-0 snap-start w-[70%] sm:w-[40%] md:w-[30%] lg:w-[calc((100%-5rem)/5)]";

const {
  label,
  products,
  loading = false,
  loadingMore = false,
  canLoadMore = false,
} = defineProps<{
  label: string;
  products: (ProductCardData & { id: string })[];
  viewAllTo: string;
  loading?: boolean;
  loadingMore?: boolean;
  canLoadMore?: boolean;
}>();

const emit = defineEmits<{
  loadMore: [];
}>();

defineSlots<{
  header?: () => VNode[];
  actions?: () => VNode[];
}>();

const skeletonCount = computed(() => (loading ? 5 : loadingMore ? 2 : 0));
const showViewAll = computed(() => !loading && !loadingMore && !canLoadMore && products.length > 0);

const scroller = useTemplateRef("scroller");
// The ends are only measured on scroll by default, so cards loading in or a resize would leave the arrows stale
const { arrivedState, measure } = useScroll(scroller, { observe: { mutation: true } });
useResizeObserver(scroller, () => measure());
const reducedMotion = usePreferredReducedMotion();
const scrollable = computed(() => !(arrivedState.left && arrivedState.right));

useInfiniteScroll(scroller, () => emit("loadMore"), {
  direction: "right",
  distance: 300,
  canLoadMore: () => canLoadMore && !loadingMore,
});

function scrollByPage(direction: 1 | -1) {
  const el = scroller.value;
  if (!el) return;

  el.scrollBy({
    left: direction * el.clientWidth * 0.9,
    behavior: reducedMotion.value === "reduce" ? "auto" : "smooth",
  });
}
</script>
