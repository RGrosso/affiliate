<template>
  <AdminContainer heading="Tags">
    <template #actions>
      <UButton
        to="/admin/tags/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        Add tag
      </UButton>
    </template>

    <div
      v-if="tags.length > 0"
      class="border border-default rounded-md overflow-hidden"
    >
      <UTable
        :data="tags"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #name-cell="{ row }">
          <NuxtLink
            :to="`/admin/tags/${row.original.id}`"
            class="inline-block rounded-md hover:underline"
          >
            <CoreTag
              :label="row.original.name"
              :icon="row.original.icon"
            />
          </NuxtLink>
        </template>
        <template #priority-cell="{ row }">
          {{ row.original.priority ?? "—" }}
        </template>
        <template #showOnCards-cell="{ row }">
          {{ row.original.showOnCards ? "Yes" : "No" }}
        </template>
        <template #productCount-cell="{ row }">
          <NuxtLink
            :to="`/admin/products?tag=${row.original.slug}`"
            class="text-highlighted hover:underline"
          >
            {{ row.original.productCount }}
          </NuxtLink>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              :to="`/admin/tags/${row.original.id}`"
              :aria-label="`Edit ${row.original.name}`"
            />
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :aria-label="`Delete ${row.original.name}`"
              @click="deleteTag(row.original)"
            />
          </div>
        </template>
      </UTable>
    </div>

    <div
      v-else-if="status !== 'pending'"
      class="bg-default text-default border border-default rounded-md p-12 text-center flex flex-col items-center justify-center shadow-sm"
    >
      <div class="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted mb-4">
        <UIcon
          name="i-lucide-tags"
          class="w-6 h-6"
        />
      </div>
      <h2 class="text-sm font-semibold mb-1">No tags yet</h2>
      <p class="text-sm text-muted max-w-sm">
        Choose Add tag to create one with a description, tooltip and icon, then add it to products from the product page.
      </p>
      <UButton
        to="/admin/tags/new"
        variant="outline"
        color="neutral"
        class="mt-4"
      >
        Add tag
      </UButton>
    </div>
  </AdminContainer>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { AdminTag } from "#shared/types/tag";

const toast = useToast();
const { confirm } = useConfirmDialog();
const { tags, status, remove } = useTags();

const columns: TableColumn<AdminTag>[] = [
  { accessorKey: "name", header: "Tag" },
  { accessorKey: "slug", header: "Slug" },
  { accessorKey: "priority", header: "Priority" },
  { accessorKey: "showOnCards", header: "On cards" },
  { accessorKey: "productCount", header: "Products" },
  // An empty-string header renders a text node the server HTML lacks, causing a hydration mismatch
  { id: "actions", header: () => h("span", { class: "sr-only" }, "Actions") },
];

async function deleteTag(tag: AdminTag) {
  if (tag.collections.length) {
    const names = formatList(tag.collections.map(collection => collection.title));
    await confirm({
      title: `"${tag.name}" can't be deleted`,
      description: `This tag is used by ${names}. Remove it from ${tag.collections.length === 1 ? "that collection" : "those collections"} first.`,
      confirmLabel: "OK",
      cancelLabel: "Close",
      color: "neutral",
    });
    return;
  }

  const count = tag.productCount;
  const confirmed = await confirm({
    title: `Delete "${tag.name}"?`,
    description:
      count > 0
        ? `This removes the tag from ${count} ${count === 1 ? "product" : "products"}. This can't be undone.`
        : "It isn't on any products. This can't be undone.",
    confirmLabel: "Delete tag",
    color: "error",
  });
  if (!confirmed) return;

  try {
    await remove(tag.id);
    toast.add({ title: "Tag deleted", color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't delete tag",
      description: getApiError(error).message,
      color: "error",
    });
  }
}
</script>
