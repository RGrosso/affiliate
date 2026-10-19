<template>
  <div class="flex flex-wrap items-start gap-2">
    <USelect
      :model-value="condition.type"
      :items="typeItems"
      :aria-label="`${label} type`"
      class="w-32"
      @update:model-value="changeType"
    />

    <USelect
      :model-value="condition.operator"
      :items="operatorItems"
      :aria-label="`${label} operator`"
      class="w-40"
      @update:model-value="update({ operator: $event })"
    />

    <UFormField
      v-if="condition.type === RuleType.Tag"
      :name="`${name}.tagId`"
      class="flex-1 min-w-48"
    >
      <USelectMenu
        :model-value="condition.tagId || undefined"
        :items="tagItems"
        value-key="id"
        label-key="name"
        :search-input="{ placeholder: 'Search tags' }"
        placeholder="Choose a tag"
        icon="i-lucide-tags"
        :aria-label="`${label} tag`"
        class="w-full"
        :ui="{ placeholder: 'truncate text-muted' }"
        @update:model-value="update({ tagId: $event })"
      >
        <template #empty> No tags found </template>
      </USelectMenu>
    </UFormField>

    <UFormField
      v-else
      :name="`${name}.retailer`"
      class="flex-1 min-w-48"
    >
      <USelectMenu
        :model-value="condition.retailer || undefined"
        :items="retailers"
        create-item="always"
        :search-input="{ placeholder: 'Search or type a retailer' }"
        placeholder="Choose or type a retailer"
        icon="i-heroicons-building-storefront"
        :aria-label="`${label} retailer`"
        class="w-full"
        :ui="{ placeholder: 'truncate text-muted' }"
        @update:model-value="update({ retailer: $event })"
        @create="update({ retailer: $event })"
      >
        <template #create-item-label="{ item }"> Use "{{ item }}" </template>
        <template #empty> No retailers yet. Type one to use it. </template>
      </USelectMenu>
    </UFormField>

    <UButton
      icon="i-lucide-trash-2"
      color="neutral"
      variant="ghost"
      :aria-label="`Remove ${label.toLowerCase()}`"
      @click="emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import { RuleType } from "#shared/types/collectionRules";
import type { ConditionType, DraftCondition } from "~/utils/collectionRulesDraft";
import type { Tag } from "#shared/types/tag";

const { name, label, tags, retailers } = defineProps<{
  /** The form path of this row, so validation messages land on its fields (e.g. `rules.rules.0`). */
  name: string;
  /** Names the row for screen readers, e.g. "Condition 2". */
  label: string;
  tags: Pick<Tag, "id" | "name">[];
  /** Retailers to offer. A value typed in is added to the model, so the parent should include the rows' own values. */
  retailers: string[];
}>();

const condition = defineModel<DraftCondition>({ required: true });

const emit = defineEmits<{
  remove: [];
}>();

const typeItems = Object.values(RuleType)
  .filter((type): type is ConditionType => type !== RuleType.Group)
  .map(type => ({ label: conditionTypeLabels[type], value: type }));

const operatorItems = computed(() => conditionOperatorItems[condition.value.type]);

const tagItems = computed(() => tags.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, LOCALE)));

function update(change: Partial<DraftCondition>) {
  condition.value = { ...condition.value, ...change };
}

function changeType(type: ConditionType) {
  if (type !== condition.value.type) condition.value = changeConditionType(condition.value, type);
}
</script>
