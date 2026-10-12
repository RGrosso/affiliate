<template>
  <AdminContainer :heading="product?.title ?? 'Edit product'">
    <template #actions>
      <UButton
        to="/admin/products"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
      >
        Products
      </UButton>
    </template>

    <template v-if="product">
      <CoreAlert
        v-if="product.isSample"
        variant="warning"
        title="This is a sample product"
        description="It was added to show how your store looks. You can edit it, but it's still a sample: it keeps its Sample badge and is removed when you delete all sample products from the Products page."
      />

      <ProductForm
        :key="product.id"
        :product="product"
        @saved="onSaved"
      />
    </template>

    <CoreAlert
      v-else-if="error"
      variant="error"
      title="Couldn't load this product"
      :description="getApiError(error).message"
    />
  </AdminContainer>
</template>

<script setup lang="ts">
import type { EditableProduct } from "#shared/types/product";

const route = useRoute();
const id = route.params.id as string;

// Nitro can't infer the response type from a template-literal URL, so give it explicitly
const { data, error } = await useFetch<ApiSuccess<EditableProduct & { isSample: boolean }>>(`/api/products/${id}`);

const product = computed(() => data.value?.data ?? null);

function onSaved(saved: EditableProduct) {
  if (data.value) {
    data.value = { ...data.value, data: { ...data.value.data, ...saved } };
  }
}
</script>
