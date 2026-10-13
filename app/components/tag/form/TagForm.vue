<template>
  <UForm
    ref="form"
    :schema="updateTagSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <div class="flex items-center gap-2 rounded-md bg-muted p-3">
      <span class="text-sm text-muted">Preview</span>
      <CoreTag
        :label="state.name.trim() || 'Tag name'"
        :icon="state.icon"
        :tooltip="state.tooltip.trim() || null"
      />
    </div>

    <UFormField
      label="Name"
      name="name"
      required
    >
      <UInput
        v-model="state.name"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Description"
      name="description"
    >
      <UTextarea
        v-model="state.description"
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Tooltip"
      name="tooltip"
      help="Shown when someone hovers over or focuses the tag."
    >
      <UInput
        v-model="state.tooltip"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Icon"
      name="icon"
    >
      <TagIconSelect v-model="state.icon" />
    </UFormField>

    <UFormField
      label="Priority"
      name="priority"
      help="Higher shows first. Leave empty for 0."
    >
      <UInputNumber
        v-model="state.priority"
        :locale="LOCALE"
        class="w-full"
      />
    </UFormField>

    <UFormField
      name="showOnCards"
      help="Product cards show up to 3 tags, highest priority first."
    >
      <USwitch
        v-model="state.showOnCards"
        label="Show on product cards"
      />
    </UFormField>

    <div class="flex justify-end gap-2">
      <UButton
        color="neutral"
        variant="outline"
        :disabled="saving"
        @click="emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="saving"
      >
        Save tag
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { z } from "#shared/schemas/zod";
import { updateTagSchema } from "#shared/schemas/tags.schema";
import type { Tag } from "#shared/types/tag";

type Schema = z.output<typeof updateTagSchema>;

const { tag } = defineProps<{
  tag: Tag;
}>();

const emit = defineEmits<{
  saved: [tag: Tag];
  cancel: [];
}>();

const toast = useToast();
const form = useTemplateRef("form");
const { update } = useTags();

const state = reactive({
  name: tag.name,
  description: tag.description ?? "",
  tooltip: tag.tooltip ?? "",
  icon: tag.icon,
  priority: tag.priority,
  showOnCards: tag.showOnCards,
});

const saving = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true;
  try {
    emit("saved", await update(tag.id, event.data));
  } catch (error) {
    const apiError = getApiError(error);
    const fieldErrors = toFormErrors(apiError.fieldErrors);

    if (fieldErrors.length) {
      form.value?.setErrors(fieldErrors);
    } else {
      toast.add({ title: "Couldn't save tag", description: apiError.message, color: "error" });
    }
  } finally {
    saving.value = false;
  }
}
</script>
