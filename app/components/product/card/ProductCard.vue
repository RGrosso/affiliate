<template>
  <article class="group relative flex flex-col gap-3">
    <div class="relative aspect-square rounded-md bg-elevated overflow-hidden">
      <img
        v-if="product.image"
        :src="product.image.url"
        :alt="product.image.alt ?? product.title"
        class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div
        v-else
        class="size-full flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-photo"
          class="w-12 h-12 text-dimmed"
        />
      </div>

      <!-- Above the stretched link, so the tag tooltips stay focusable and hoverable -->
      <div
        v-if="cardTags.length"
        class="absolute top-2 left-2 right-2 z-10 flex flex-wrap gap-1"
      >
        <CoreTag
          v-for="tag in cardTags"
          :key="tag.id"
          :label="tag.name"
          :icon="tag.icon"
          :tooltip="tag.tooltip"
        />
      </div>
    </div>

    <div class="px-1 flex flex-col items-center gap-1 text-center">
      <h3 class="text-base font-bold leading-snug text-highlighted line-clamp-2">
        <!-- The whole card is clickable through this link's ::after, without nesting the tags inside a link -->
        <NuxtLink
          :to="`/product/${product.handle}`"
          class="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary group-hover:underline"
        >
          {{ product.title }}
        </NuxtLink>
      </h3>
      <span
        v-if="product.pricePence != null"
        class="font-display font-bold text-lg text-highlighted"
      >
        {{ formatCurrency(product.pricePence, { minDecimals: 0 }) }}
      </span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ProductImage } from "#shared/types/product";
import type { TagBadge } from "#shared/types/tag";

export type ProductCardData = {
  title: string;
  handle: string;
  pricePence: number | null;
  image: ProductImage | null;
  tags?: TagBadge[];
};

const { product } = defineProps<{
  product: ProductCardData;
}>();

const cardTags = computed(() => (product.tags ?? []).slice(0, MAX_CARD_TAGS));
</script>
