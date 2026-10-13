<template>
  <USelect
    v-model="selected"
    :items="items"
    class="w-full"
    aria-label="Icon"
  />
</template>

<script setup lang="ts">
import type { SelectItem } from "@nuxt/ui";
import { tagIcons, type TagIcon } from "#shared/types/tag";

const model = defineModel<TagIcon | null>({ default: null });

// Select items can't hold null as a value, so "No icon" uses a placeholder value
const NO_ICON = "none";

const items: SelectItem[] = [
  { label: "No icon", value: NO_ICON },
  ...tagIcons.map(icon => ({ label: tagIconLabels[icon], value: icon, icon: tagIconNames[icon] })),
];

const selected = computed({
  get: () => model.value ?? NO_ICON,
  set: (value: string) => {
    model.value = value === NO_ICON ? null : (value as TagIcon);
  },
});
</script>
