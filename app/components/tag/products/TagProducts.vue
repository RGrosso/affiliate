<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold">
          Products with this tag
        </h2>
        <UButton
          v-if="total > 0"
          :to="`/admin/products?tag=${slug}`"
          color="neutral"
          variant="link"
          size="sm"
        >
          View in products list
        </UButton>
      </div>
    </template>

    <ul
      v-if="products.length"
      class="divide-y divide-default"
      aria-label="Products with this tag"
    >
      <li
        v-for="product in products"
        :key="product.id"
        class="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
      >
        <img
          v-if="product.image"
          :src="product.image.url"
          :alt="product.image.alt ?? product.title"
          class="size-10 max-w-none shrink-0 aspect-square object-cover rounded-md border border-default"
          loading="lazy"
        >
        <div
          v-else
          class="size-10 shrink-0 aspect-square rounded-md bg-muted flex items-center justify-center text-muted"
        >
          <UIcon
            name="i-heroicons-photo"
            class="size-5"
          />
        </div>
        <div class="min-w-0">
          <NuxtLink
            :to="`/admin/products/${product.id}`"
            class="font-medium text-highlighted hover:underline"
          >
            {{ product.title }}
          </NuxtLink>
          <p class="text-sm text-muted truncate">
            {{ product.retailer ?? "No retailer" }}
          </p>
        </div>
      </li>
    </ul>

    <p
      v-else-if="!loading"
      class="text-sm text-muted"
    >
      No products have this tag yet. Add it from a product's Tags card.
    </p>

    <CorePagination
      v-model:page="page"
      :total="total"
      :page-size="pageSize"
      class="mt-4 flex justify-end"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { ProductListItem } from "#shared/types/product";

defineProps<{
  slug: string;
  products: Pick<ProductListItem, "id" | "title" | "retailer" | "image">[];
  total: number;
  pageSize: number;
  loading?: boolean;
}>();

const page = defineModel<number>("page", { default: 1 });
</script>
