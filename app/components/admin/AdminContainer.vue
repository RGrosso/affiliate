<template>
  <div class="max-w-5xl mx-auto px-8 py-4 space-y-6">
    <div class="flex items-center justify-between">
      <h1>{{ heading }}</h1>
      <slot name="actions" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { VNode } from "vue";

defineProps<{
  heading: string;
}>();

defineSlots<{
  default: () => VNode;
  actions?: () => VNode;
}>();
</script>
