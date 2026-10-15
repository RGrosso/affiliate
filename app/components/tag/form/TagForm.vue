<template>
  <UForm
    ref="form"
    :schema="createTagSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UCard>
      <div class="space-y-4">
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
          :help="`Product cards show up to ${MAX_CARD_TAGS} tags, highest priority first.`"
        >
          <USwitch
            v-model="state.showOnCards"
            label="Show on product cards"
          />
        </UFormField>
      </div>
    </UCard>

    <CoreButtonBar
      :show="isDirty || saving"
      :message="tag ? 'Unsaved changes' : 'Unsaved tag'"
    >
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="saving"
        @click="cancel"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        size="sm"
        :loading="saving"
      >
        Save
      </UButton>
    </CoreButtonBar>
  </UForm>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { z } from "#shared/schemas/zod";
import { createTagSchema } from "#shared/schemas/tags.schema";
import type { Tag } from "#shared/types/tag";

type Schema = z.output<typeof createTagSchema>;

const { tag } = defineProps<{
  tag?: Tag;
}>();

const emit = defineEmits<{
  saved: [tag: Tag];
}>();

const toast = useToast();
const form = useTemplateRef("form");
const { create, update } = useTags();

const toState = (tag?: Tag) => ({
  name: tag?.name ?? "",
  description: tag?.description ?? "",
  tooltip: tag?.tooltip ?? "",
  icon: tag?.icon ?? null,
  priority: tag?.priority ?? null,
  showOnCards: tag?.showOnCards ?? false,
});

const state = reactive(toState(tag));
const saving = ref(false);

// Compared with the last saved version, so saving makes the form clean and the leave prompt stays quiet
const snapshot = () =>
  JSON.stringify({
    ...state,
    name: state.name.trim(),
    description: state.description.trim(),
    tooltip: state.tooltip.trim(),
    priority: state.priority ?? null,
  });

const savedSnapshot = ref(snapshot());
const isDirty = computed(() => snapshot() !== savedSnapshot.value);

useUnsavedChangesGuard(isDirty);

function cancel() {
  Object.assign(state, toState(tag));
  form.value?.clear();
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true;
  try {
    const saved = tag ? await update(tag.id, event.data) : await create(event.data);
    savedSnapshot.value = snapshot();
    emit("saved", saved);
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
