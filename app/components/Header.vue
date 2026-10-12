<template>
  <UHeader
    :ui="{
      root: 'h-auto',
      container: 'h-(--ui-header-height) gap-6',
      left: 'lg:flex-none',
      center: 'flex-1 max-w-xl',
      right: 'lg:flex-none',
    }"
  >
    <template #top>
      <div class="bg-primary-700 dark:bg-primary-900 text-white text-sm font-semibold text-center px-4 py-2.5">
        Gift ideas for humans, hounds and everything in between
      </div>
    </template>

    <template #title>
      <span class="font-display font-bold text-3xl tracking-tight text-primary">
        {{ SITE_NAME }}<span class="text-action-500">.</span>
      </span>
    </template>

    <form
      role="search"
      class="w-full"
      @submit.prevent="onSearch"
    >
      <UInput
        v-model="query"
        :placeholder="SEARCH_PLACEHOLDER"
        aria-label="Search gifts"
        icon="i-heroicons-magnifying-glass"
        size="xl"
        class="w-full"
      />
    </form>

    <template #right>
      <UColorModeButton />
      <UDropdownMenu
        v-if="user"
        :items="dropdownItems"
        :content="{ align: 'end' }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          trailing-icon="i-heroicons-chevron-down-20-solid"
        >
          <UAvatar
            color="primary"
            :alt="user.username"
          />
          <span class="font-medium">{{ user.username }}</span>
        </UButton>
      </UDropdownMenu>
      <UButton
        v-else
        to="/login"
        label="Log in"
        color="neutral"
        variant="ghost"
      />
    </template>

    <template #bottom>
      <CoreContainer>
        <nav
          aria-label="Categories"
          class="flex gap-1.5 overflow-x-auto pb-3 [scrollbar-width:none]"
        >
          <UButton
            v-for="category in categories"
            :key="category.label"
            :to="category.to"
            :label="category.label"
            :color="category.highlight ? 'secondary' : 'neutral'"
            variant="ghost"
            class="shrink-0 font-semibold"
          />
        </nav>
      </CoreContainer>
    </template>

    <template #body>
      <form
        role="search"
        @submit.prevent="onSearch"
      >
        <UInput
          v-model="query"
          :placeholder="SEARCH_PLACEHOLDER"
          aria-label="Search gifts"
          icon="i-heroicons-magnifying-glass"
          size="xl"
          class="w-full"
        />
      </form>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { DropdownMenuItem } from "@nuxt/ui";

const SEARCH_PLACEHOLDER = "Search 'gifts for a cat who has everything'";

// WIP: search isn't wired up yet, and categories all land on the unfiltered product list
const query = ref("");

const toast = useToast();
let searchToastId: string | number | undefined;

function onSearch() {
  // Replace the previous notice so repeated searches don't stack toasts
  if (searchToastId !== undefined) toast.remove(searchToastId);
  searchToastId = toast.add({
    title: "Search is coming soon",
    description: "We're still building it. For now, try browsing the categories instead.",
    icon: "i-heroicons-magnifying-glass",
    color: "info",
  }).id;
}

const categories = [
  { label: "For her", to: "/products?for=her" },
  { label: "For him", to: "/products?for=him" },
  { label: "For kids", to: "/products?for=kids" },
  { label: "For dogs", to: "/products?for=dogs" },
  { label: "For cats", to: "/products?for=cats" },
  { label: "Under £20", to: "/products?max=20" },
  { label: "Silly stuff", to: "/products?tag=silly", highlight: true },
];

const { user, isAdmin, logout } = useAuth();

const dropdownItems = computed<DropdownMenuItem[][]>(() => [
  [
    ...(isAdmin.value
      ? [{
          label: "Admin Dashboard",
          icon: "i-heroicons-squares-2x2",
          to: "/admin",
        }]
      : []),
    {
      label: "Logout",
      icon: "i-heroicons-arrow-left-on-rectangle",
      onSelect: logout,
    },
  ],
]);
</script>
