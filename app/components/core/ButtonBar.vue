<template>
  <Transition
    enter-from-class="opacity-0 translate-y-4"
    leave-to-class="opacity-0 translate-y-4"
    enter-active-class="transition duration-200"
    leave-active-class="transition duration-150"
  >
    <div
      v-if="show"
      class="sticky bottom-0 z-20 -mx-2 pb-4 pt-2"
      role="region"
      :aria-label="message"
    >
      <div class="flex items-center justify-between gap-4 rounded-xl bg-inverted text-inverted px-4 py-2.5 shadow-lg">
        <span class="text-sm font-medium flex items-center gap-2 min-w-0">
          <UIcon
            :name="icon"
            class="size-5 shrink-0"
          />
          <span class="truncate">{{ message }}</span>
        </span>
        <div class="flex gap-2 shrink-0">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { VNode } from "vue";

/**
 * A persistent action bar pinned to the bottom of the scroll area, e.g. for
 * Save / Cancel while a form has unsaved changes. Buttons go in the default slot.
 */
withDefaults(defineProps<{
  show: boolean;
  message?: string;
  icon?: string;
}>(), {
  message: "Unsaved changes",
  icon: "i-heroicons-exclamation-circle",
});

defineSlots<{
  default: () => VNode[];
}>();
</script>
