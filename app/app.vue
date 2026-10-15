<template>
  <UApp
    :locale="en_gb"
    :toaster="{ position: 'top-right' }"
  >
    <!-- Keeps the footer at the bottom of short pages -->
    <div class="min-h-dvh flex flex-col">
      <Header />
      <div class="flex-1">
        <NuxtPage />
      </div>
      <Footer />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { en_gb } from "@nuxt/ui/locale";

useHead({
  titleTemplate: title => (title ? `${title} · ${SITE_NAME}` : SITE_NAME),
});
</script>
