<template>
  <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
    <p
      class="font-semibold text-highlighted"
      aria-live="polite"
    >
      {{ total }} {{ total === 1 ? "product" : "products" }}
    </p>

    <div class="flex flex-wrap items-center gap-3">
      <USelect
        v-if="tags.length"
        v-model="tagValue"
        :items="tagItems"
        aria-label="Filter by tag"
        class="w-44"
      />
      <USelect
        v-model="sort"
        :items="sortOptions"
        aria-label="Sort by"
        class="w-48"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductSort, TagFacet } from "#shared/types/collection";

// A real tag slug can't hold an asterisk, and the select doesn't allow an empty value
const ALL_TAGS = "*";

const { tags = [] } = defineProps<{
  total: number;
  sortOptions: { label: string; value: ProductSort }[];
  tags?: TagFacet[];
}>();

const sort = defineModel<ProductSort>("sort", { required: true });
const tag = defineModel<string | undefined>("tag");

const tagItems = computed(() => [{ label: "All", value: ALL_TAGS }, ...tags.map(({ name, slug }) => ({ label: name, value: slug }))]);

const tagValue = computed({
  get: () => tag.value ?? ALL_TAGS,
  set: value => {
    tag.value = value === ALL_TAGS ? undefined : value;
  },
});
</script>
