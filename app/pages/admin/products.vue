<template>
  <div class="max-w-6xl mx-auto p-8 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight">
        Products
      </h1>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="isAddProductOpen = true"
      >
        Add product
      </UButton>
    </div>

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
      <UButton
        variant="outline"
        color="neutral"
        @click="isAddProductOpen = true"
      >
        Add product
      </UButton>
    </div>

    <USlideover
      v-model:open="isAddProductOpen"
      title="Add a product"
    >
      <template #content>
        <div class="p-4 space-y-4">
          <p class="text-sm text-muted-foreground">
            Product configuration form will go here.
          </p>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
const isAddProductOpen = ref(false);
</script>
