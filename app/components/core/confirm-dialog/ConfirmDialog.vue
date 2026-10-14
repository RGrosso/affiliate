<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="true"
    :ui="{ title: 'text-base font-semibold', footer: 'justify-end' }"
  >
    <template
      v-if="question"
      #body
    >
      <p class="text-sm font-medium">
        {{ question }}
      </p>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        @click="emit('close', false)"
      >
        {{ cancelLabel }}
      </UButton>
      <UButton
        :color="color"
        @click="emit('close', true)"
      >
        {{ confirmLabel }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const {
  title,
  description,
  question,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  color = "primary",
} = defineProps<{
  title: string;
  description?: string;
  question?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: "primary" | "error" | "warning" | "neutral";
}>();

const open = defineModel<boolean>("open", { default: true });

// Dismissing with Esc or a click outside resolves the overlay with undefined, which callers treat as "no"
const emit = defineEmits<{
  close: [confirmed: boolean];
}>();
</script>
