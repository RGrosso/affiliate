<template>
  <AdminContainer heading="Collections">
    <template #actions>
      <UButton
        to="/admin/collections/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        Add collection
      </UButton>
    </template>

    <CoreAlert
      v-if="error"
      variant="error"
      title="Couldn't load the collections"
      :description="getApiError(error).message"
    />

    <div
      v-else-if="collections.length"
      class="border border-default rounded-md overflow-hidden"
    >
      <UTable
        :data="collections"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #title-cell="{ row }">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              :to="`/admin/collections/${row.original.id}`"
              class="font-medium text-highlighted hover:underline"
            >
              {{ row.original.title }}
            </NuxtLink>
            <CoreTag
              v-if="row.original.locked"
              label="Locked"
            />
          </div>
        </template>
        <template #type-cell="{ row }">
          {{ collectionTypeLabels[row.original.type] }}
        </template>
        <template #status-cell="{ row }">
          <CoreTag
            :label="collectionStatusLabels[row.original.status]"
            :color="row.original.status === CollectionStatus.Published ? 'success' : 'neutral'"
          />
        </template>
        <template #productCount-cell="{ row }">
          {{ row.original.productCount }}
        </template>
        <template #rulesSummary-cell="{ row }">
          <span class="text-muted">{{ row.original.rulesSummary ?? "—" }}</span>
        </template>
        <template #view-cell="{ row }">
          <NuxtLink
            :to="`/collections/${row.original.handle}`"
            class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            :aria-label="`View ${row.original.title} on the site`"
          >
            View
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="size-4"
            />
          </NuxtLink>
        </template>
      </UTable>
    </div>

    <div
      v-else-if="status !== 'pending'"
      class="bg-default text-default border border-default rounded-md p-12 text-center flex flex-col items-center justify-center shadow-sm"
    >
      <h2 class="text-sm font-semibold mb-1">No collections yet</h2>
      <p class="text-sm text-muted max-w-sm mb-4">Group products into collections that visitors can browse.</p>
      <UButton
        to="/admin/collections/new"
        variant="outline"
        color="neutral"
      >
        Add collection
      </UButton>
    </div>
  </AdminContainer>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { ApiSuccess } from "#shared/types/api";
import { CollectionStatus, type AdminCollectionListItem } from "#shared/types/collection";

const { data, status, error, refresh } = await useFetch<ApiSuccess<AdminCollectionListItem[]>>("/api/collections", { key: "admin-collections" });

const collections = computed(() => data.value?.data ?? []);

// The list is cached under its key, so refresh it to show a collection just added or changed
onMounted(() => {
  if (!useNuxtApp().isHydrating) refresh();
});

const columns: TableColumn<AdminCollectionListItem>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "productCount", header: "Products" },
  { accessorKey: "rulesSummary", header: "Conditions" },
  { id: "view", header: () => h("span", { class: "sr-only" }, "View on site") },
];
</script>
