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

        <ul
          v-else-if="items.length"
          class="divide-y divide-default"
          :class="{ 'opacity-60': status === 'pending' }"
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
          v-else-if="status !== 'pending'"
          class="text-sm text-muted text-center py-6"
        >
          {{ search.trim() ? "No products match that search." : "There are no products yet." }}
        </p>

        <CorePagination
          v-model:page="page"
          :total="total"
          :page-size="PAGE_SIZE"
          class="flex justify-end"
        />
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
import type { ApiSuccess } from "#shared/types/api";
import type { PagedResult } from "#shared/types/pagination";
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
const page = ref(1);
// Kept across searches and pages, so products ticked on one page are still added from another
const selected = ref(new Map<string, ProductListItem>());

watchDebounced(
  search,
  value => {
    debouncedSearch.value = value.trim();
    page.value = 1;
  },
  { debounce: 300 }
);

// Fetched once the dialog is first opened, then again for each search or page
const { data, status, error, refresh } = useFetch<ApiSuccess<PagedResult<ProductListItem>>>("/api/products", {
  query: computed(() => ({ q: debouncedSearch.value || undefined, page: page.value, pageSize: PAGE_SIZE })),
  immediate: false,
  watch: false,
});

watch(
  [open, debouncedSearch, page],
  () => {
    if (open.value) refresh();
  },
  { immediate: true }
);

const items = computed(() => data.value?.data.items ?? []);
const total = computed(() => data.value?.data.total ?? 0);

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
  page.value = 1;
});
</script>
