<template>
  <div class="flex h-screen bg-default text-default overflow-hidden">
    <aside class="w-60 border-r border-default bg-muted flex flex-col justify-between p-3 select-none shrink-0">
      <div class="space-y-4">
        <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-elevated">
          <div class="h-6 w-6 rounded bg-secondary flex items-center justify-center text-inverted font-bold text-xs">
            {{ SITE_NAME[0] }}
          </div>
          <span class="font-semibold text-sm truncate">{{ SITE_NAME }} Admin</span>
        </div>

        <UNavigationMenu
          orientation="vertical"
          :items="navigationItems"
          class="w-full"
          :ui="{
            root: 'space-y-0.5',
            link: 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          }"
        />
      </div>
    </aside>
    <main class="flex-1 overflow-y-auto bg-default">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "#app";
import type { NavigationMenuItem } from "@nuxt/ui";

definePageMeta({
  layout: false,
  middleware: ["admin-role"],
  minimalHeader: true,
  hideFooter: true,
});

const route = useRoute();

const navigationItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Home",
    icon: "i-heroicons-home-20-solid",
    to: "/admin",
    active: route.path === "/admin" || route.path === "/admin/",
  },
  {
    label: "Products",
    icon: "i-heroicons-tag-20-solid",
    to: "/admin/products",
    active: route.path.startsWith("/admin/products"),
  },
  {
    label: "Tags",
    icon: "i-lucide-tags",
    to: "/admin/tags",
    active: route.path.startsWith("/admin/tags"),
  },
  {
    label: "Collections",
    icon: "i-lucide-layout-grid",
    to: "/admin/collections",
    active: route.path.startsWith("/admin/collections"),
  },
  {
    label: "Add product",
    icon: "i-heroicons-plus-solid",
    to: "/admin/add-product",
    active: route.path.startsWith("/admin/add-product"),
  },
]);
</script>
