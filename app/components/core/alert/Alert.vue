<template>
  <UAlert
    :color="variant"
    variant="subtle"
    :icon="icon ?? ICONS[variant]"
    :title="title"
    :description="description"
    :actions="actions"
  />
</template>

<script setup lang="ts">
import type { AlertProps } from "@nuxt/ui";

export type CoreAlertVariant = "success" | "error" | "warning" | "info";

const ICONS: Record<CoreAlertVariant, string> = {
  success: "i-heroicons-check-circle",
  error: "i-heroicons-exclamation-circle",
  warning: "i-heroicons-exclamation-triangle",
  info: "i-heroicons-information-circle",
};

defineProps<{
  variant: CoreAlertVariant;
  title: string;
  description?: string;
  icon?: string;
  actions?: AlertProps["actions"];
}>();
</script>
