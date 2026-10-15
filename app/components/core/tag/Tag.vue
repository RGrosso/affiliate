<template>
  <UTooltip
    v-if="tooltip"
    :text="tooltip"
  >
    <UBadge
      v-bind="badgeProps"
      tabindex="0"
    />
  </UTooltip>
  <UBadge
    v-else
    v-bind="badgeProps"
  />
</template>

<script setup lang="ts">
import type { BadgeProps } from "@nuxt/ui";
import type { TagIcon } from "#shared/types/tag";

const {
  label,
  color = "neutral",
  icon,
  tooltip,
} = defineProps<{
  label: string;
  color?: BadgeProps["color"];
  icon?: TagIcon | null;
  tooltip?: string | null;
}>();

const badgeProps = computed<BadgeProps>(() => ({
  label,
  color,
  icon: icon ? tagIconNames[icon] : undefined,
  variant: "subtle",
  size: "sm",
  class: "font-semibold",
}));
</script>
