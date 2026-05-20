<template>
  <AdminContainer heading="Products">
    <template #action>
      <NuxtLink to="/admin/add-product">
        <UButton
          color="primary"
          icon="i-heroicons-plus"
        >
          Add product
        </UButton>
      </NuxtLink>
    </template>

    <div class="bg-card text-card-foreground border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
      <div class="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-4">
        <UIcon
          name="i-heroicons-tag"
          class="w-6 h-6"
        />
      </div>
      <h2 class="text-sm font-semibold mb-1">
        First step: add your products
      </h2>
      <p class="text-sm text-muted-foreground max-w-sm mb-4">
        Write descriptions, set prices, and upload product images to start selling items on your site.
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
  </AdminContainer>
</template>
