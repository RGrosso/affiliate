<template>
  <UHeader>
    <template #title>
      <Logo class="h-6 w-auto" />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "#app";
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "Home",
    to: "/",
    active: route.path === "/",
  },
  {
    label: "Products",
    to: "/products",
    active: route.path.startsWith("/products"),
  },
]);
</script>
