<template>
  <div class="space-y-3">
    <USelectMenu
      v-model="selected"
      v-model:search-term="searchTerm"
      :items="options"
      value-key="id"
      label-key="name"
      multiple
      :create-item="canCreate ? 'always' : false"
      :loading="creating"
      :search-input="{ placeholder: 'Search or add tags' }"
      placeholder="Search or add tags"
      trailing-icon="i-lucide-circle-plus"
      aria-label="Tags"
      icon="i-lucide-tags"
      class="w-full"
      @create="onCreate"
    >
      <template #content-top>
        <p class="px-3 py-2 text-sm font-semibold border-b border-default">
          Tags
        </p>
      </template>
      <template #create-item-label>
        Add "{{ name }}"
      </template>
      <template #empty>
        No tags found
      </template>
    </USelectMenu>

    <ul
      v-if="chosen.length"
      class="flex flex-wrap gap-2"
      aria-label="Selected tags"
    >
      <li
        v-for="tag in chosen"
        :key="tag.id"
        class="inline-flex items-center gap-0.5"
      >
        <CoreTag
          :label="tag.name"
          :icon="tag.icon"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="link"
          size="xs"
          :aria-label="`Remove ${tag.name}`"
          @click="remove(tag.id)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from "#shared/types/tag";

const { tags, creating = false } = defineProps<{
  tags: Tag[];
  creating?: boolean;
}>();

const selected = defineModel<string[]>({ default: () => [] });

const emit = defineEmits<{
  create: [name: string];
}>();

const searchTerm = ref("");

const name = computed(() => searchTerm.value.trim());

const sorted = computed(() => [...tags].sort((a, b) => a.name.localeCompare(b.name, LOCALE)));

const options = computed(() => sorted.value.map(({ id, name }) => ({ id, name })));

const chosen = computed(() => sorted.value.filter(tag => selected.value.includes(tag.id)));

// Compare slugs so "Foo" doesn't offer to add a tag when "foo" already exists
const canCreate = computed(() => {
  const slug = slugify(name.value);
  return !!slug && !tags.some(tag => tag.slug === slug);
});

function onCreate() {
  if (!canCreate.value) return;
  emit("create", name.value);
  searchTerm.value = "";
}

function remove(id: string) {
  selected.value = selected.value.filter(value => value !== id);
}
</script>
