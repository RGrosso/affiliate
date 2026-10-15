<template>
  <AdminContainer :heading="tag?.name ?? 'Tag'">
    <template #actions>
      <UButton
        to="/admin/tags"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
      >
        Tags
      </UButton>
    </template>

    <template v-if="tag && products">
      <TagForm
        :key="tag.id"
        :tag="tag"
        @saved="onSaved"
      />

      <TagProducts
        v-model:page="products.page.value"
        :slug="tag.slug"
        :products="products.items.value"
        :total="products.total.value"
        :page-size="products.pageSize"
        :loading="products.status.value === 'pending'"
      />

      <div>
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          :loading="removing"
          @click="deleteTag"
        >
          Delete tag
        </UButton>
      </div>
    </template>

    <CoreAlert
      v-else-if="error"
      variant="error"
      title="Couldn't load this tag"
      :description="getApiError(error).message"
    />
  </AdminContainer>
</template>

<script setup lang="ts">
import type { ApiSuccess } from "#shared/types/api";
import type { ProductListItem } from "#shared/types/product";
import type { Tag } from "#shared/types/tag";

const route = useRoute();
const id = route.params.id as string;
const toast = useToast();
const { confirm } = useConfirmDialog();
const { remove } = useTags();

// Nitro can't infer the response type from a template-literal URL, so give it explicitly
const { data, error, refresh } = await useFetch<ApiSuccess<Tag>>(`/api/tags/${id}`);

const tag = computed(() => data.value?.data ?? null);

// Only fetched for a tag that exists: without a slug the filter would list every product
const products = tag.value
  ? await usePagedFetch<ProductListItem>("/api/products", {
      query: () => ({ tag: tag.value?.slug, allTags: "true" }),
    })
  : null;

const removing = ref(false);

async function onSaved() {
  toast.add({ title: "Tag saved", color: "success" });
  await refresh();
}

async function deleteTag() {
  if (!tag.value) return;

  const count = products?.total.value ?? 0;
  const confirmed = await confirm({
    title: `Delete "${tag.value.name}"?`,
    description:
      count > 0
        ? `This removes the tag from ${count} ${count === 1 ? "product" : "products"}. This can't be undone.`
        : "It isn't on any products. This can't be undone.",
    confirmLabel: "Delete tag",
    color: "error",
  });
  if (!confirmed) return;

  removing.value = true;
  try {
    await remove(id);
    toast.add({ title: "Tag deleted", color: "success" });
    await navigateTo("/admin/tags");
  } catch (err) {
    toast.add({ title: "Couldn't delete tag", description: getApiError(err).message, color: "error" });
  } finally {
    removing.value = false;
  }
}
</script>
