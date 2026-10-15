import {
  RetailerOperator,
  RuleMatch,
  RuleType,
  TagOperator,
  type CollectionRule,
  type CollectionRuleItem,
  type CollectionRules
} from "#shared/types/collectionRules";
import {
  STORED_RULES_VERSION,
  StoredRetailerOperator,
  StoredRuleMatch,
  StoredRuleType,
  StoredTagOperator,
  type StoredCollectionRule,
  type StoredCollectionRuleItem,
  type StoredCollectionRules
} from "./storedCollectionRules";

// Every API value maps to a stored one and back; the Record types make TypeScript flag a missing entry
const matchToStored: Record<RuleMatch, StoredRuleMatch> = {
  [RuleMatch.All]: StoredRuleMatch.All,
  [RuleMatch.Any]: StoredRuleMatch.Any,
};

const matchFromStored: Record<StoredRuleMatch, RuleMatch> = {
  [StoredRuleMatch.All]: RuleMatch.All,
  [StoredRuleMatch.Any]: RuleMatch.Any,
};

const tagOperatorToStored: Record<TagOperator, StoredTagOperator> = {
  [TagOperator.Has]: StoredTagOperator.Has,
  [TagOperator.HasNot]: StoredTagOperator.HasNot,
};

const tagOperatorFromStored: Record<StoredTagOperator, TagOperator> = {
  [StoredTagOperator.Has]: TagOperator.Has,
  [StoredTagOperator.HasNot]: TagOperator.HasNot,
};

const retailerOperatorToStored: Record<RetailerOperator, StoredRetailerOperator> = {
  [RetailerOperator.Is]: StoredRetailerOperator.Is,
  [RetailerOperator.IsNot]: StoredRetailerOperator.IsNot,
};

const retailerOperatorFromStored: Record<StoredRetailerOperator, RetailerOperator> = {
  [StoredRetailerOperator.Is]: RetailerOperator.Is,
  [StoredRetailerOperator.IsNot]: RetailerOperator.IsNot,
};

function ruleToStored(rule: CollectionRule): StoredCollectionRule {
  switch (rule.type) {
    case RuleType.Tag:
      return { type: StoredRuleType.Tag, operator: tagOperatorToStored[rule.operator], tagId: rule.tagId };
    case RuleType.Retailer:
      return { type: StoredRuleType.Retailer, operator: retailerOperatorToStored[rule.operator], retailer: rule.retailer };
  }
}

function ruleFromStored(rule: StoredCollectionRule): CollectionRule {
  switch (rule.type) {
    case StoredRuleType.Tag:
      return { type: RuleType.Tag, operator: tagOperatorFromStored[rule.operator], tagId: rule.tagId };
    case StoredRuleType.Retailer:
      return { type: RuleType.Retailer, operator: retailerOperatorFromStored[rule.operator], retailer: rule.retailer };
  }
}

function itemToStored(item: CollectionRuleItem): StoredCollectionRuleItem {
  if (item.type === RuleType.Group) {
    return { type: StoredRuleType.Group, match: matchToStored[item.match], rules: item.rules.map(ruleToStored) };
  }
  return ruleToStored(item);
}

function itemFromStored(item: StoredCollectionRuleItem): CollectionRuleItem {
  if (item.type === StoredRuleType.Group) {
    return { type: RuleType.Group, match: matchFromStored[item.match], rules: item.rules.map(ruleFromStored) };
  }
  return ruleFromStored(item);
}

export function toStoredRules(rules: CollectionRules): StoredCollectionRules {
  return { version: STORED_RULES_VERSION, match: matchToStored[rules.match], rules: rules.rules.map(itemToStored) };
}

export function fromStoredRules(stored: StoredCollectionRules): CollectionRules {
  return { match: matchFromStored[stored.match], rules: stored.rules.map(itemFromStored) };
}
