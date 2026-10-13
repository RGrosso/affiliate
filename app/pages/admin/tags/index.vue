<template>
  <AdminContainer heading="Tags">
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
          <CoreTag
            :label="row.original.name"
            :icon="row.original.icon"
            :tooltip="row.original.tooltip"
          />
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
              :aria-label="`Edit ${row.original.name}`"
              @click="editing = row.original"
            />
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :aria-label="`Delete ${row.original.name}`"
              @click="deleting = row.original"
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
      <h2 class="text-sm font-semibold mb-1">
        No tags yet
      </h2>
      <p class="text-sm text-muted max-w-sm">
        Add tags to products from the product page. They'll appear here so you can add a description, tooltip and icon.
      </p>
    </div>

    <UModal
      v-model:open="editOpen"
      :title="editing ? `Edit ${editing.name}` : 'Edit tag'"
    >
      <template #body>
        <TagForm
          v-if="editing"
          :key="editing.id"
          :tag="editing"
          @saved="onSaved"
          @cancel="editing = null"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="deleteOpen"
      :title="deleteTitle"
      :dismissible="!removing"
    >
      <template #body>
        <div
          v-if="deleting"
          class="flex gap-3"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="size-6 shrink-0 text-warning"
          />
          <p class="text-sm text-muted">
            {{ deleting.productCount > 0
              ? `This removes the tag from ${deleting.productCount} ${deleting.productCount === 1 ? "product" : "products"}.`
              : "It isn't on any products." }}
            This can't be undone.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="removing"
            @click="deleting = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="removing"
            @click="deleteTag"
          >
            Delete tag
          </UButton>
        </div>
      </template>
    </UModal>
  </AdminContainer>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { AdminTag, Tag } from "#shared/types/tag";

const toast = useToast();
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

const editing = ref<AdminTag | null>(null);
const deleting = ref<AdminTag | null>(null);
const removing = ref(false);

// The modals are driven by the selected tag, so closing one clears it
const editOpen = computed({
  get: () => !!editing.value,
  set: (open) => {
    if (!open) editing.value = null;
  },
});
const deleteOpen = computed({
  get: () => !!deleting.value,
  set: (open) => {
    if (!open) deleting.value = null;
  },
});

const deleteTitle = computed(() => (deleting.value ? `Delete "${deleting.value.name}"?` : "Delete tag?"));

function onSaved(tag: Tag) {
  editing.value = null;
  toast.add({ title: "Tag saved", description: `"${tag.name}" was updated.`, color: "success" });
}

async function deleteTag() {
  if (!deleting.value) return;

  removing.value = true;
  try {
    await remove(deleting.value.id);
    deleting.value = null;
    toast.add({ title: "Tag deleted", color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't delete tag",
      description: getApiError(error).message,
      color: "error",
    });
  } finally {
    removing.value = false;
  }
}
</script>
