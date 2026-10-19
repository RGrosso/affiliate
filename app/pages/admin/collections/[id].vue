<template>
  <AdminContainer :heading="collection?.title ?? 'Edit collection'">
    <template #actions>
      <UButton
        to="/admin/collections"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
      >
        Collections
      </UButton>
    </template>

    <template v-if="collection">
      <CollectionForm
        :key="collection.id"
        :collection="collection"
        :products="products"
        @saved="onSaved"
      />

      <div v-if="!collection.locked">
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          :loading="removing"
          @click="deleteCollection"
        >
          Delete collection
        </UButton>
      </div>
    </template>

    <CoreAlert
      v-else-if="error"
      variant="error"
      title="Couldn't load this collection"
      :description="getApiError(error).message"
    />
  </AdminContainer>
</template>

<script setup lang="ts">
import type { ApiSuccess } from "#shared/types/api";
import { CollectionType, type AdminCollection, type CollectionProductsPage } from "#shared/types/collection";
import type { ProductListItem } from "#shared/types/product";

const PAGE_SIZE = 100;

const route = useRoute();
const id = route.params.id as string;
const toast = useToast();
const { confirm } = useConfirmDialog();
// Plain $fetch drops the session cookie during server rendering
const requestFetch = useRequestFetch();

// Nitro can't infer the response type from a template-literal URL, so give it explicitly
const { data, error } = await useFetch<ApiSuccess<AdminCollection>>(`/api/collections/${id}`);

const collection = computed(() => data.value?.data ?? null);

// The form needs each chosen product's title, image and price, which the collection itself only lists as ids.
// A draft collection is readable here because the request is the admin's.
async function loadProducts(handle: string): Promise<ProductListItem[]> {
  const url = `/api/collections/handle/${handle}/products`;
  const items: ProductListItem[] = [];
  for (let page = 1; ; page++) {
    const { data: result } = await requestFetch<ApiSuccess<CollectionProductsPage>>(url, {
      query: { sort: "manual", page, pageSize: PAGE_SIZE },
    });
    items.push(...result.items);
    if (page >= result.totalPages) return items;
  }
}

const { data: products } = await useAsyncData(
  `admin-collection-products-${id}`,
  async () => (collection.value?.type === CollectionType.Manual ? loadProducts(collection.value.handle) : []),
  { default: () => [] }
);

const removing = ref(false);

function onSaved(saved: AdminCollection) {
  data.value = data.value && { ...data.value, data: saved };
}

async function deleteCollection() {
  if (!collection.value) return;

  const confirmed = await confirm({
    title: `Delete "${collection.value.title}"?`,
    description: "The collection is removed from your site. Its products aren't deleted. This can't be undone.",
    confirmLabel: "Delete collection",
    color: "error",
  });
  if (!confirmed) return;

  removing.value = true;
  try {
    await $fetch(`/api/collections/${id}`, { method: "DELETE" });
    toast.add({ title: "Collection deleted", color: "success" });
    await navigateTo("/admin/collections");
  } catch (err) {
    toast.add({ title: "Couldn't delete collection", description: getApiError(err).message, color: "error" });
  } finally {
    removing.value = false;
  }
}
</script>
