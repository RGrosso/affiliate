<template>
  <UHeader>
    <template #title>
      Affiliate
    </template>
    <UNavigationMenu :items="items" />
    <template #right>
      <div class="flex items-center space-x-2">
        <UColorModeButton />
        <div v-if="user">
          <UDropdownMenu
            :items="dropdownItems"
            :popper="{ placement: 'bottom-end' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              trailing-icon="i-heroicons-chevron-down-20-solid"
            >
              <UAvatar color="primary" :alt="user.username"/>
              <span class="font-medium">{{ user.username }}</span>
            </UButton>
          </UDropdownMenu>
        </div>
        <div v-else>
          <NuxtLink to="/login">
            <UButton>Log in</UButton>
          </NuxtLink>
        </div>
      </div>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "#app";
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

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

const userSession = useUserSession();
const user = userSession.user;

async function handleLogout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await userSession.fetch();
}

const dropdownItems = computed<DropdownMenuItem[][]>(() => [
    [
      {
      label: "Admin Dashboard",
      icon: "i-heroicons-squares-2x2",
      to: "/admin",
    },
    {
      label: "Logout",
      icon: "i-heroicons-arrow-left-on-rectangle",
      onSelect: handleLogout,
      class: "cursor-pointer",
    }
  ]
]);
</script>
