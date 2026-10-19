<template>
  <UModal
    v-model:open="open"
    title="Add products"
    description="Search for products by title and tick the ones to add."
  >
    <template #body>
      <div class="space-y-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search by title"
          aria-label="Search products"
          class="w-full"
        />

        <CoreAlert
          v-if="error"
          variant="error"
          title="Couldn't load the products"
          :description="getApiError(error).message"
        />

        <div
          ref="scroller"
          class="max-h-[50vh] overflow-y-auto"
        >
          <ul
            v-if="items.length"
            class="divide-y divide-default"
            aria-label="Products"
          >
            <li
              v-for="product in items"
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
              <UCheckbox
                :model-value="isAdded(product) || selected.has(product.id)"
                :disabled="isAdded(product)"
                :label="product.title"
                :description="describe(product)"
                class="min-w-0 flex-1"
                @update:model-value="toggle(product)"
              />
            </li>
          </ul>

          <p
            v-else-if="!loading && !error"
            class="text-sm text-muted text-center py-6"
          >
            {{ search.trim() ? "No products match that search." : "There are no products yet." }}
          </p>

          <div
            v-if="loading"
            class="flex justify-center py-3"
            role="status"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin text-muted"
            />
            <span class="sr-only">Loading products</span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          @click="open = false"
        >
          Cancel
        </UButton>
        <UButton
          :disabled="!selected.size"
          @click="add"
        >
          {{ selected.size ? `Add ${selected.size} ${selected.size === 1 ? "product" : "products"}` : "Add products" }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ProductListItem } from "#shared/types/product";

const PAGE_SIZE = 8;

const { addedIds } = defineProps<{
  /** Products already in the collection. They are shown ticked and can't be chosen again. */
  addedIds: string[];
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  add: [products: ProductListItem[]];
}>();

const search = ref("");
const debouncedSearch = ref("");
// Kept across searches and pages, so products ticked on one page are still added from another
const selected = ref(new Map<string, ProductListItem>());

watchDebounced(
  search,
  value => {
    debouncedSearch.value = value.trim();
  },
  { debounce: 300 }
);

// Loads once the dialog is first opened, and again from page 1 for each search
const { items, loading, error, hasMore, loadNext } = useInfiniteList<ProductListItem>("/api/products", {
  pageSize: PAGE_SIZE,
  query: () => ({ q: debouncedSearch.value || undefined }),
  enabled: open,
});

const scroller = useTemplateRef("scroller");
useInfiniteScroll(scroller, loadNext, { distance: 100, canLoadMore: () => hasMore.value && !loading.value });

const isAdded = (product: ProductListItem) => addedIds.includes(product.id);

function describe(product: ProductListItem) {
  if (isAdded(product)) return "Already in this collection";
  return [product.retailer, product.pricePence == null ? null : formatCurrency(product.pricePence)].filter(Boolean).join(" · ") || undefined;
}

function toggle(product: ProductListItem) {
  if (!selected.value.delete(product.id)) selected.value.set(product.id, product);
}

function add() {
  emit("add", [...selected.value.values()]);
  open.value = false;
}

// A fresh start each time the dialog opens
watch(open, isOpen => {
  if (isOpen) return;
  selected.value = new Map();
  search.value = "";
  debouncedSearch.value = "";
});
</script>
