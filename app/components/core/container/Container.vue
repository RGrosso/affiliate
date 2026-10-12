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

export type CoreContainerVariant = "default" | "padded" | "full";

const { variant = "default", as = "div" } = defineProps<{
  variant?: CoreContainerVariant;
  as?: "div" | "section" | "main" | "header" | "footer" | "article";
}>();

defineSlots<{
  default: () => VNode[];
}>();
</script>
