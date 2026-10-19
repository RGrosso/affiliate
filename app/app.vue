<template>
  <UApp
    :locale="en_gb"
    :toaster="{ position: 'top-right' }"
  >
    <!-- Keeps the footer at the bottom of short pages. A fillViewport page gets exactly the viewport, so it can scroll inside it. -->
    <div
      class="flex flex-col"
      :class="route.meta.fillViewport ? 'h-dvh' : 'min-h-dvh'"
    >
      <Header />
      <div class="flex-1 min-h-0">
        <NuxtPage />
      </div>
      <Footer />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { en_gb } from "@nuxt/ui/locale";

const route = useRoute();

useHead({
  titleTemplate: title => (title ? `${title} · ${SITE_NAME}` : SITE_NAME),
});
</script>
