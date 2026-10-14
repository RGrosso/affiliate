<template>
  <div>
    <!-- The bar is fixed over the page, so reserve its height to keep the last content reachable -->
    <div
      v-if="show"
      class="h-20"
      aria-hidden="true"
      data-test="button-bar-spacer"
    />
    <Transition
      enter-from-class="translate-y-full"
      leave-to-class="translate-y-full"
      enter-active-class="motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
      leave-active-class="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-in"
    >
      <div
        v-if="show"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-info-300 bg-info-100 text-info-900 dark:border-info-700 dark:bg-info-900 dark:text-info-100 shadow-[0_-4px_12px_rgb(0_0_0/0.08)]"
        role="region"
        :aria-label="message"
      >
        <CoreContainer class="flex items-center justify-between gap-4 py-3">
          <span class="text-sm font-medium flex items-center gap-2 min-w-0">
            <UIcon
              :name="icon"
              class="size-5 shrink-0 text-info-700 dark:text-info-200"
            />
            <span class="truncate">{{ message }}</span>
          </span>
          <div class="flex gap-2 shrink-0">
            <slot />
          </div>
        </CoreContainer>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { VNode } from "vue";

const {
  show,
  message = "Unsaved changes",
  icon = "i-heroicons-exclamation-circle",
} = defineProps<{
  show: boolean;
  message?: string;
  icon?: string;
}>();

defineSlots<{
  default: () => VNode[];
}>();
</script>
