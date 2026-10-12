<template>
  <UCard
    class="group flex flex-col rounded-md"
    :ui="{ body: 'p-3 sm:p-3 flex-1 flex flex-col gap-3' }"
  >
    <div class="aspect-square rounded-sm bg-elevated overflow-hidden">
      <img
        v-if="product.image"
        :src="product.image.url"
        :alt="product.image.alt ?? product.title"
        class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      >
      <div
        v-else
        class="size-full flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-photo"
          class="w-12 h-12 text-dimmed"
        />
      </div>
    </div>

    <div class="px-1 flex-1 flex flex-col gap-1">
      <h3 class="text-base font-bold leading-snug text-highlighted line-clamp-2">
        {{ product.title }}
      </h3>
      <p
        v-if="product.retailer"
        class="text-sm text-toned"
      >
        {{ product.retailer }}
      </p>
      <div class="mt-auto pt-2 flex justify-between items-center gap-4">
        <span class="font-display font-bold text-xl text-highlighted">
          {{ formatCurrency(product.pricePence, { minDecimals: 0 }) ?? "" }}
        </span>
        <ULink
          v-if="product.affiliateUrl"
          :to="product.affiliateUrl"
          target="_blank"
          rel="sponsored noopener noreferrer"
          raw
          class="text-sm font-bold text-primary hover:underline"
        >
          View
        </ULink>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { ProductImage } from "#shared/types/product";

export type ProductCardData = {
  title: string;
  retailer: string | null;
  pricePence: number | null;
  affiliateUrl: string | null;
  image: ProductImage | null;
};

defineProps<{
  product: ProductCardData;
}>();
</script>
