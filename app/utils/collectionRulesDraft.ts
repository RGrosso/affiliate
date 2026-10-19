import {
  RetailerOperator,
  RuleMatch,
  RuleType,
  TagOperator,
  type CollectionRule,
  type CollectionRuleItem,
  type CollectionRules,
} from "#shared/types/collectionRules";

// The form edits rules in this shape: every row has a client-side `key` for `v-for` and carries the fields of
// both kinds of condition, so switching a row's type keeps the row. `toRules` strips it back to the API shape.
export type DraftCondition = {
  key: string;
  type: typeof RuleType.Tag | typeof RuleType.Retailer;
  operator: TagOperator | RetailerOperator;
  tagId: string;
  retailer: string;
};

export type DraftGroup = {
  key: string;
  type: typeof RuleType.Group;
  match: RuleMatch;
  rules: DraftCondition[];
};

export type DraftRuleItem = DraftCondition | DraftGroup;

export type DraftRules = {
  match: RuleMatch;
  rules: DraftRuleItem[];
};

export type ConditionType = DraftCondition["type"];

const newKey = () => crypto.randomUUID();

const defaultOperator: Record<ConditionType, DraftCondition["operator"]> = {
  [RuleType.Tag]: TagOperator.Has,
  [RuleType.Retailer]: RetailerOperator.Is,
};

export function newCondition(type: ConditionType = RuleType.Tag): DraftCondition {
  return { key: newKey(), type, operator: defaultOperator[type], tagId: "", retailer: "" };
}

export function newGroup(): DraftGroup {
  return { key: newKey(), type: RuleType.Group, match: RuleMatch.All, rules: [newCondition()] };
}

/** A new automated collection starts with one empty condition so the form is ready to fill in. */
export function newDraftRules(): DraftRules {
  return { match: RuleMatch.All, rules: [newCondition()] };
}

/** The same row as another type: the operator goes back to that type's default and the value is cleared. */
export function changeConditionType(condition: DraftCondition, type: ConditionType): DraftCondition {
  return { ...condition, type, operator: defaultOperator[type], tagId: "", retailer: "" };
}

const conditionToDraft = (rule: CollectionRule): DraftCondition =>
  rule.type === RuleType.Tag
    ? { key: newKey(), type: rule.type, operator: rule.operator, tagId: rule.tagId, retailer: "" }
    : { key: newKey(), type: rule.type, operator: rule.operator, tagId: "", retailer: rule.retailer };

const itemToDraft = (item: CollectionRuleItem): DraftRuleItem =>
  item.type === RuleType.Group ? { key: newKey(), type: item.type, match: item.match, rules: item.rules.map(conditionToDraft) } : conditionToDraft(item);

export function toDraftRules(rules: CollectionRules): DraftRules {
  return { match: rules.match, rules: rules.rules.map(itemToDraft) };
}

function conditionToRule(condition: DraftCondition): CollectionRule {
  return condition.type === RuleType.Tag
    ? { type: condition.type, operator: condition.operator as TagOperator, tagId: condition.tagId }
    : { type: condition.type, operator: condition.operator as RetailerOperator, retailer: condition.retailer };
}

export function toRules(draft: DraftRules): CollectionRules {
  return {
    match: draft.match,
    rules: draft.rules.map(item =>
      item.type === RuleType.Group ? { type: item.type, match: item.match, rules: item.rules.map(conditionToRule) } : conditionToRule(item)
    ),
  };
}
