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

    <CoreAlert
      v-if="sampleCount > 0"
      variant="warning"
      title="You're viewing sample products"
      :description="`These ${sampleCount} products are here to show how your store looks. Delete them before you go live.`"
      :actions="[{
        label: 'Delete sample products',
        color: 'warning',
        variant: 'solid',
        onClick: () => { confirmOpen = true; },
      }]"
    />

    <USelectMenu
      v-model="tagFilter"
      :items="tagItems"
      value-key="value"
      placeholder="Filter by tag"
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
        </template>
        <template #title-cell="{ row }">
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/admin/products/${row.original.id}`"
              class="font-medium text-highlighted hover:underline"
            >
              {{ row.original.title }}
            </NuxtLink>
            <CoreTag
              v-if="row.original.isSample"
              label="Sample"
              color="warning"
            />
          </div>
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
      v-else-if="status !== 'pending' && tagFilter"
      class="bg-default text-default border border-default rounded-md p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm"
    >
      <p class="text-sm text-muted">
        No products have this tag.
      </p>
      <UButton
        variant="outline"
        color="neutral"
        @click="tagFilter = undefined"
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
      <h2 class="text-sm font-semibold mb-1">
        First step: add your products
      </h2>
      <p class="text-sm text-muted max-w-sm mb-4">
        Write descriptions, add affiliate links, and upload product images to start sharing items on your site.
      </p>
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

    <UModal
      v-model:open="confirmOpen"
      :title="`Delete ${sampleCount} sample products?`"
      :dismissible="!deleting"
    >
      <template #body>
        <div class="flex gap-3">
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="size-6 shrink-0 text-warning"
          />
          <p class="text-sm text-muted">
            This permanently removes every sample product and its images. Products you've added yourself won't be affected. This can't be undone.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="deleting"
            @click="confirmOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="deleting"
            @click="deleteSamples"
          >
            Delete sample products
          </UButton>
        </div>
      </template>
    </UModal>
  </AdminContainer>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { ProductListItem } from "#shared/types/product";

const toast = useToast();

const route = useRoute();
const router = useRouter();
const { tags } = useTags();

const tagItems = computed(() => tags.value.map(tag => ({ label: tag.name, value: tag.slug })));

const tagFilter = computed<string | undefined>({
  get() {
    const value = Array.isArray(route.query.tag) ? route.query.tag[0] : route.query.tag;
    return value || undefined;
  },
  set(slug) {
    const { tag: _tag, page: _page, ...rest } = route.query;
    router.replace({ query: slug ? { ...rest, tag: slug } : rest });
  },
});

const { data, items: products, total, page, pageSize, status, refresh } = await usePagedFetch<ProductListItem, { sampleCount: number }>("/api/products", {
  query: () => ({ tag: tagFilter.value, allTags: "true" }),
});

const sampleCount = computed(() => data.value?.sampleCount ?? 0);

const columns: TableColumn<ProductListItem>[] = [
  // An empty-string header renders a text node the server HTML lacks, causing a hydration mismatch
  { id: "image", header: () => h("span", { class: "sr-only" }, "Image") },
  { accessorKey: "title", header: "Product" },
  { accessorKey: "retailer", header: "Retailer" },
  { id: "tags", header: "Tags" },
  { accessorKey: "createdAt", header: "Added" },
];

const confirmOpen = ref(false);
const deleting = ref(false);

async function deleteSamples() {
  deleting.value = true;
  try {
    const { data: result } = await $fetch("/api/products/samples", { method: "DELETE" });
    confirmOpen.value = false;
    toast.add({
      title: "Sample products deleted",
      description: `${result.deleted} sample products were removed.`,
      color: "success",
    });
    await refresh();
  } catch (error) {
    toast.add({
      title: "Couldn't delete sample products",
      description: getApiError(error).message,
      color: "error",
    });
  } finally {
    deleting.value = false;
  }
}
</script>
