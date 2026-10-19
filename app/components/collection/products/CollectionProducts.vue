<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold">Products ({{ products.length }})</h2>
        <UButton
          icon="i-heroicons-plus"
          color="neutral"
          variant="outline"
          size="sm"
          @click="picking = true"
        >
          Add products
        </UButton>
      </div>
    </template>

    <UFormField name="productIds">
      <ul
        v-if="products.length"
        class="divide-y divide-default"
        aria-label="Products in this collection"
      >
        <li
          v-for="product in products"
          :key="product.id"
          class="flex items-center gap-3 py-2"
        >
          <img
            v-if="product.image"
            :src="product.image.url"
            alt=""
            class="size-10 max-w-none shrink-0 aspect-square object-cover rounded-md border border-default"
          />
          <div
            v-else
            class="size-10 shrink-0 aspect-square rounded-md bg-muted flex items-center justify-center text-muted"
            aria-hidden="true"
          >
            <UIcon
              name="i-heroicons-photo"
              class="size-5"
            />
          </div>
          <span class="min-w-0 flex-1 truncate font-medium text-highlighted">{{ product.title }}</span>
          <span
            v-if="product.pricePence != null"
            class="text-sm text-muted"
          >
            {{ formatCurrency(product.pricePence) }}
          </span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="`Remove ${product.title}`"
            @click="remove(product.id)"
          />
        </li>
      </ul>
      <p
        v-else
        class="text-sm text-muted"
      >
        No products yet. Add the products you want in this collection. They show in the order you add them.
      </p>
    </UFormField>

    <CollectionProductPicker
      v-model:open="picking"
      :added-ids="products.map(product => product.id)"
      @add="add"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { ProductListItem } from "#shared/types/product";

const products = defineModel<ProductListItem[]>({ default: () => [] });

const picking = ref(false);

function add(added: ProductListItem[]) {
  const existing = new Set(products.value.map(product => product.id));
  products.value = [...products.value, ...added.filter(product => !existing.has(product.id))];
}

function remove(id: string) {
  products.value = products.value.filter(product => product.id !== id);
}
</script>
