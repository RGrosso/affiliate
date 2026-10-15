<template>
  <AdminContainer heading="Products">
    <template #actions>
      <NuxtLink to="/admin/add-product">
        <UButton
          color="primary"
          icon="i-heroicons-plus"
        >
          Add product
        </UButton>
      </NuxtLink>
    </template>

    <USelectMenu
      v-model="tagFilter"
      :items="tagItems"
      value-key="value"
      multiple
      placeholder="Filter by tags"
      icon="i-lucide-tags"
      clear
      searchable
      class="w-full sm:w-64"
    />

    <div
      v-if="total > 0"
      class="border border-default rounded-md overflow-hidden"
    >
      <UTable
        :data="products"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #image-cell="{ row }">
          <img
            v-if="row.original.image"
            :src="row.original.image.url"
            :alt="row.original.image.alt ?? row.original.title"
            class="size-10 max-w-none shrink-0 aspect-square object-cover rounded-md border border-default"
            loading="lazy"
          />
          <div
            v-else
            class="size-10 shrink-0 aspect-square rounded-md bg-muted flex items-center justify-center text-muted"
          >
            <UIcon
              name="i-heroicons-photo"
              class="size-5"
            />
          </div>
        </template>
        <template #title-cell="{ row }">
          <NuxtLink
            :to="`/admin/products/${row.original.id}`"
            class="font-medium text-highlighted hover:underline"
          >
            {{ row.original.title }}
          </NuxtLink>
        </template>
        <template #retailer-cell="{ row }">
          {{ row.original.retailer ?? "—" }}
        </template>
        <template #tags-cell="{ row }">
          <div
            v-if="row.original.tags.length"
            class="flex flex-wrap gap-1 min-w-32"
          >
            <CoreTag
              v-for="tag in row.original.tags"
              :key="tag.id"
              :label="tag.name"
              :icon="tag.icon"
              :tooltip="tag.tooltip"
            />
          </div>
          <span v-else>—</span>
        </template>
        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
        </template>
      </UTable>
    </div>

    <div
      v-else-if="status !== 'pending' && tagFilter.length"
      class="bg-default text-default border border-default rounded-md p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm"
    >
      <p class="text-sm text-muted">
        {{ tagFilter.length > 1 ? "No products have these tags." : "No products have this tag." }}
      </p>
      <UButton
        variant="outline"
        color="neutral"
        @click="tagFilter = []"
      >
        Clear filter
      </UButton>
    </div>

    <div
      v-else-if="status !== 'pending'"
      class="bg-default text-default border border-default rounded-md p-12 text-center flex flex-col items-center justify-center shadow-sm"
    >
      <div class="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted mb-4">
        <UIcon
          name="i-heroicons-tag"
          class="w-6 h-6"
        />
      </div>
      <h2 class="text-sm font-semibold mb-1">First step: add your products</h2>
      <p class="text-sm text-muted max-w-sm mb-4">Write descriptions, add affiliate links, and upload product images to start sharing items on your site.</p>
      <NuxtLink to="/admin/add-product">
        <UButton
          variant="outline"
          color="neutral"
        >
          Add product
        </UButton>
      </NuxtLink>
    </div>

    <CorePagination
      v-if="total > 0"
      v-model:page="page"
      :total="total"
      :page-size="pageSize"
      class="mt-4 flex justify-end"
    />
  </AdminContainer>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { ProductListItem } from "#shared/types/product";

const route = useRoute();
const router = useRouter();
const { tags } = useTags();

const tagItems = computed(() => tags.value.map(tag => ({ label: tag.name, value: tag.slug })));

const tagFilter = computed<string[]>({
  get() {
    const value = route.query.tag;
    return [value ?? []].flat().filter((slug): slug is string => !!slug);
  },
  set(slugs) {
    const { tag: _tag, page: _page, ...rest } = route.query;
    router.replace({ query: slugs.length ? { ...rest, tag: slugs } : rest });
  },
});

const {
  items: products,
  total,
  page,
  pageSize,
  status,
} = await usePagedFetch<ProductListItem>("/api/products", {
  query: () => ({ tag: tagFilter.value, allTags: "true" }),
});

const columns: TableColumn<ProductListItem>[] = [
  // An empty-string header renders a text node the server HTML lacks, causing a hydration mismatch
  { id: "image", header: () => h("span", { class: "sr-only" }, "Image") },
  { accessorKey: "title", header: "Product" },
  { accessorKey: "retailer", header: "Retailer" },
  { id: "tags", header: "Tags" },
  { accessorKey: "createdAt", header: "Added" },
];
</script>
