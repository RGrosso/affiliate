<template>
  <CoreContainer variant="padded">
    <div class="flex flex-col items-center text-center gap-4 py-16">
      <h1 class="text-4xl">All products</h1>
      <p class="max-w-md">Collections are coming soon. In the meantime, the homepage has our latest finds.</p>
      <UButton
        to="/"
        label="Back to the homepage"
        variant="outline"
        color="neutral"
      />
    </div>
  </CoreContainer>
</template>

<script setup lang="ts">
useSeoMeta({ title: "All products" });
</script>
