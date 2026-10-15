import {
  RetailerOperator,
  RuleMatch,
  RuleType,
  TagOperator,
  type CollectionRuleItem,
  type CollectionRules
} from "../types/collectionRules";

type RuleOfType<T extends RuleType> = Extract<CollectionRuleItem, { type: T }>;
type TagNames = ReadonlyMap<string, string>;

const joiners: Record<RuleMatch, string> = {
  [RuleMatch.All]: " and ",
  [RuleMatch.Any]: " or ",
};

const describeTag: Record<TagOperator, (name: string) => string> = {
  [TagOperator.Has]: name => `has ${name}`,
  [TagOperator.HasNot]: name => `doesn't have ${name}`,
};

const describeRetailer: Record<RetailerOperator, (retailer: string) => string> = {
  [RetailerOperator.Is]: retailer => `retailer is ${retailer}`,
  [RetailerOperator.IsNot]: retailer => `retailer isn't ${retailer}`,
};

// One entry per rule type: TypeScript flags a new type that is missing here
const describers: { [T in RuleType]: (rule: RuleOfType<T>, tagNames: TagNames) => string } = {
  [RuleType.Tag]: (rule, tagNames) => {
    const name = tagNames.get(rule.tagId);
    return describeTag[rule.operator](name === undefined ? "a deleted tag" : `the tag “${name}”`);
  },
  [RuleType.Retailer]: rule => describeRetailer[rule.operator](rule.retailer),
  [RuleType.Group]: (group, tagNames) => {
    const text = group.rules.map(rule => describeItem(rule, tagNames)).join(joiners[group.match]);
    return group.rules.length > 1 ? `(${text})` : text;
  },
};

// TypeScript can't correlate the lookup key with the argument it narrows, so the cast is needed
function describeItem(item: CollectionRuleItem, tagNames: TagNames): string {
  return (describers[item.type] as (rule: CollectionRuleItem, names: TagNames) => string)(item, tagNames);
}

/** `tagNames` maps tag ids to names; a tag missing from it reads as deleted. */
export function describeRules(rules: CollectionRules, tagNames: TagNames): string {
  if (!rules.rules.length) return "No conditions";

  const text = rules.rules.map(item => describeItem(item, tagNames)).join(joiners[rules.match]);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The distinct tag ids the rules refer to, in the order they first appear. */
export function collectTagIds(rules: CollectionRules): string[] {
  const conditions = rules.rules.flatMap(item => (item.type === RuleType.Group ? item.rules : [item]));
  return [...new Set(conditions.flatMap(rule => (rule.type === RuleType.Tag ? [rule.tagId] : [])))];
}

/** Counts conditions across subgroups; a group itself isn't one. */
export function countConditions(rules: CollectionRules): number {
  return rules.rules.reduce((total, item) => total + (item.type === RuleType.Group ? item.rules.length : 1), 0);
}
