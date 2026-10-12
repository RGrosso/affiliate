<template>
  <AdminContainer heading="Add product">
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

    <ProductForm />
  </AdminContainer>
</template>
