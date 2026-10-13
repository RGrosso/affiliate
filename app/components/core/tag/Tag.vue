<template>
  <UTooltip
    v-if="tooltip"
    :text="tooltip"
  >
    <UBadge
      :label="label"
      :color="color"
      :icon="icon ? tagIconNames[icon] : undefined"
      variant="subtle"
      size="sm"
      class="font-semibold"
      tabindex="0"
    />
  </UTooltip>
  <UBadge
    v-else
    :label="label"
    :color="color"
    :icon="icon ? tagIconNames[icon] : undefined"
    variant="subtle"
    size="sm"
    class="font-semibold"
  />
</template>

<script setup lang="ts">
import type { BadgeProps } from "@nuxt/ui";
import type { TagIcon } from "#shared/types/tag";

const { color = "neutral" } = defineProps<{
  label: string;
  color?: BadgeProps["color"];
  icon?: TagIcon | null;
  tooltip?: string | null;
}>();
</script>
