<template>
  <UBadge
    :label="label"
    :color="color"
    variant="subtle"
    size="sm"
    class="font-semibold"
  />
</template>

<script setup lang="ts">
import type { BadgeProps } from "@nuxt/ui";

const { color = "neutral" } = defineProps<{
  label: string;
  color?: BadgeProps["color"];
}>();
</script>
