<template>
  <div class="pointer-events-none absolute top-0 left-0 z-10 size-28 overflow-hidden sm:size-32">
    <!-- Clips the rotated strip to the corner. Needs a `relative` parent, and lets clicks through to what's underneath -->
    <span
      class="absolute top-6 -left-9 w-36 -rotate-45 bg-action-500 py-1 text-center text-xs font-bold tracking-wider text-signal-900 uppercase shadow-md sm:top-7 sm:-left-8"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>
