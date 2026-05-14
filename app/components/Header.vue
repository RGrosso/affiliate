<template>
  <UHeader>
    <template #title>
      Affiliate
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
  {
    label: "Login",
    to: "/login",
    active: route.path.startsWith("/login"),
  },
]);
</script>
