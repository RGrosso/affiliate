<template>
  <div class="flex h-screen bg-background text-foreground overflow-hidden">
    <aside class="w-60 border-r border-border bg-muted/30 flex flex-col justify-between p-3 select-none shrink-0">
      <div class="space-y-4">
        <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted">
          <div class="h-6 w-6 rounded bg-secondary flex items-center justify-center text-primary-foreground font-bold text-xs">
            A
          </div>
          <span class="font-semibold text-sm truncate">Affiliate Admin</span>
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
    <main class="flex-1 overflow-y-auto bg-background">
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
  }
]);
</script>
