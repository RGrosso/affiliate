<template>
  <UCard
    class="overflow-hidden group flex flex-col"
    :ui="{ header: 'p-0 sm:p-0', body: 'flex-1' }"
  >
    <template #header>
      <div class="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
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
            class="w-12 h-12 text-gray-400"
          />
        </div>
      </div>
    </template>

    <div class="space-y-1">
      <p
        v-if="product.retailer"
        class="text-sm text-gray-500"
      >
        {{ product.retailer }}
      </p>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
        {{ product.title }}
      </h3>
    </div>

    <template #footer>
      <div class="flex justify-between items-center gap-4">
        <span class="text-lg font-bold text-primary">
          {{ formatPrice(product.pricePence) ?? "" }}
        </span>
        <UButton
          v-if="product.affiliateUrl"
          :to="product.affiliateUrl"
          target="_blank"
          rel="sponsored noopener noreferrer"
          label="View deal"
          icon="i-heroicons-arrow-top-right-on-square"
          trailing
          color="primary"
          variant="soft"
          size="sm"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
export type ProductCardData = {
  title: string;
  retailer: string | null;
  pricePence: number | null;
  affiliateUrl: string | null;
  image: { url: string; alt: string | null } | null;
};

defineProps<{
  product: ProductCardData;
}>();
</script>
