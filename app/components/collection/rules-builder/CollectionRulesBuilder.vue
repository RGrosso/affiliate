<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <span>Products must match</span>
      <USelect
        :model-value="rules.match"
        :items="matchItems"
        aria-label="Match all or any conditions"
        class="w-24"
        @update:model-value="rules = { ...rules, match: $event }"
      />
      <span>of these conditions</span>
    </div>

    <UFormField name="rules.rules">
      <ul
        class="space-y-3"
        aria-label="Conditions"
      >
        <li
          v-for="(item, index) in rules.rules"
          :key="item.key"
        >
          <div
            v-if="item.type === RuleType.Group"
            class="rounded-md border border-default bg-muted/40 p-3 space-y-3"
          >
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="font-medium">Group {{ index + 1 }}</span>
              <span>matches</span>
              <USelect
                :model-value="item.match"
                :items="matchItems"
                :aria-label="`Group ${index + 1} match all or any`"
                class="w-24"
                @update:model-value="setItem(index, { ...item, match: $event })"
              />
              <span>of these conditions</span>
              <UButton
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                size="sm"
                class="ml-auto"
                :aria-label="`Remove group ${index + 1}`"
                @click="removeItem(index)"
              />
            </div>

            <UFormField :name="`rules.rules.${index}.rules`">
              <ul
                class="space-y-3"
                :aria-label="`Group ${index + 1} conditions`"
              >
                <li
                  v-for="(condition, position) in item.rules"
                  :key="condition.key"
                >
                  <CollectionRuleRow
                    :model-value="condition"
                    :name="`rules.rules.${index}.rules.${position}`"
                    :label="`Group ${index + 1} condition ${position + 1}`"
                    :tags="tags"
                    :retailers="retailerOptions"
                    @update:model-value="setItem(index, { ...item, rules: item.rules.map((existing, i) => (i === position ? $event : existing)) })"
                    @remove="setItem(index, { ...item, rules: item.rules.filter((_, i) => i !== position) })"
                  />
                </li>
              </ul>
            </UFormField>

            <UButton
              icon="i-heroicons-plus"
              color="neutral"
              variant="outline"
              size="sm"
              @click="setItem(index, { ...item, rules: [...item.rules, newCondition()] })"
            >
              Add condition<span class="sr-only"> to group {{ index + 1 }}</span>
            </UButton>
          </div>

          <CollectionRuleRow
            v-else
            :model-value="item"
            :name="`rules.rules.${index}`"
            :label="`Condition ${index + 1}`"
            :tags="tags"
            :retailers="retailerOptions"
            @update:model-value="setItem(index, $event)"
            @remove="removeItem(index)"
          />
        </li>
      </ul>
    </UFormField>

    <div class="flex flex-wrap gap-2">
      <UButton
        icon="i-heroicons-plus"
        color="neutral"
        variant="outline"
        @click="addItem(newCondition())"
      >
        Add condition
      </UButton>
      <UButton
        icon="i-lucide-brackets"
        color="neutral"
        variant="outline"
        @click="addItem(newGroup())"
      >
        Add group
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RuleMatch, RuleType } from "#shared/types/collectionRules";
import type { Tag } from "#shared/types/tag";
import type { DraftRuleItem, DraftRules } from "~/utils/collectionRulesDraft";

const { tags, retailers } = defineProps<{
  tags: Pick<Tag, "id" | "name">[];
  /** Retailers already on products. Any value typed into a row is offered as well. */
  retailers: string[];
}>();

const rules = defineModel<DraftRules>({ required: true });

const matchItems = Object.values(RuleMatch).map(match => ({ label: ruleMatchLabels[match], value: match }));

// Includes the rows' own values so a retailer typed in stays selectable, even though no product has it yet
const retailerOptions = computed(() => {
  const own = rules.value.rules.flatMap(item => (item.type === RuleType.Group ? item.rules : [item]));
  const typed = own.flatMap(condition => (condition.type === RuleType.Retailer && condition.retailer ? [condition.retailer] : []));
  return [...new Set([...retailers, ...typed])];
});

function setItems(items: DraftRuleItem[]) {
  rules.value = { ...rules.value, rules: items };
}

const setItem = (index: number, item: DraftRuleItem) => setItems(rules.value.rules.map((existing, i) => (i === index ? item : existing)));
const removeItem = (index: number) => setItems(rules.value.rules.filter((_, i) => i !== index));
const addItem = (item: DraftRuleItem) => setItems([...rules.value.rules, item]);
</script>
