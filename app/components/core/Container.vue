<template>
  <component
    :is="as"
    v-if="variant === 'full'"
    class="w-full"
  >
    <UContainer>
      <slot />
    </UContainer>
  </component>
  <UContainer
    v-else
    :as="as"
    :class="{ 'py-8 sm:py-14': variant === 'padded' }"
  >
    <slot />
  </UContainer>
</template>

<script setup lang="ts">
import type { VNode } from "vue";

// default: page-width content with side gutters
// padded: default plus vertical spacing, for the main content of a page
// full: a full-width band (put backgrounds on it) with page-width content inside
export type CoreContainerVariant = "default" | "padded" | "full";

const { variant = "default", as = "div" } = defineProps<{
  variant?: CoreContainerVariant;
  as?: string;
}>();

defineSlots<{
  default: () => VNode[];
}>();
</script>
