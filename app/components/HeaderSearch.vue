<template>
  <form
    role="search"
    class="w-full"
    @submit.prevent="onSearch"
  >
    <UInput
      v-model="query"
      placeholder="Search 'gifts for a cat who has everything'"
      aria-label="Search gifts"
      icon="i-heroicons-magnifying-glass"
      size="xl"
      class="w-full"
    />
  </form>
</template>

<script setup lang="ts">
// WIP: search isn't wired up yet. State is shared so the desktop and mobile inputs stay in step.
const query = useState("header-search-query", () => "");
const toastId = useState<string | number | undefined>("header-search-toast-id", () => undefined);

const toast = useToast();

function onSearch() {
  // Replace the previous notice so repeated searches don't stack toasts
  if (toastId.value !== undefined) toast.remove(toastId.value);
  toastId.value = toast.add({
    title: "Search is coming soon",
    description: "We're still building it, so check back soon.",
    icon: "i-heroicons-magnifying-glass",
    color: "info",
  }).id;
}
</script>
