<template>
  <UApp
    :locale="en_gb"
    :toaster="{ position: 'top-right' }"
  >
    <Header />
    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
import { en_gb } from "@nuxt/ui/locale";
</script>
