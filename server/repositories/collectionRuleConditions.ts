import { and, eq, exists, notExists, or, sql, type SQL } from "drizzle-orm";
import { productTags, products } from "hub:db:schema";
import {
  StoredRetailerOperator,
  StoredRuleMatch,
  StoredRuleType,
  StoredTagOperator,
  type StoredCollectionRuleItem,
  type StoredCollectionRules,
} from "../utils/storedCollectionRules";

type StoredRuleOfType<T extends StoredRuleType> = Extract<StoredCollectionRuleItem, { type: T }>;

const combine: Record<StoredRuleMatch, (conditions: SQL[]) => SQL | undefined> = {
  [StoredRuleMatch.All]: conditions => and(...conditions),
  // `or()` of nothing is no condition at all, which would match every product
  [StoredRuleMatch.Any]: conditions => (conditions.length ? or(...conditions) : sql`false`),
};

function hasTag(tagId: string) {
  return sql`(select 1 from ${productTags} where ${and(eq(productTags.productId, products.id), eq(productTags.tagId, tagId))})`;
}

const tagConditions: Record<StoredTagOperator, (tagId: string) => SQL> = {
  [StoredTagOperator.Has]: tagId => exists(hasTag(tagId)),
  [StoredTagOperator.HasNot]: tagId => notExists(hasTag(tagId)),
};

// Exact and case-sensitive on purpose: retailers are picked from a list. `is distinct from` keeps products with no retailer in "is not".
const retailerConditions: Record<StoredRetailerOperator, (retailer: string) => SQL> = {
  [StoredRetailerOperator.Is]: retailer => sql`${products.retailer} = ${retailer}`,
  [StoredRetailerOperator.IsNot]: retailer => sql`${products.retailer} is distinct from ${retailer}`,
};

// One entry per stored rule type: TypeScript flags a new type that is missing here
const compilers: { [T in StoredRuleType]: (rule: StoredRuleOfType<T>) => SQL | undefined } = {
  [StoredRuleType.Tag]: rule => tagConditions[rule.operator](rule.tagId),
  [StoredRuleType.Retailer]: rule => retailerConditions[rule.operator](rule.retailer),
  [StoredRuleType.Group]: group => combineAll(group.match, group.rules),
};

function compileItem(item: StoredCollectionRuleItem) {
  // TypeScript can't correlate the lookup key with the argument it narrows, so the cast is needed
  return (compilers[item.type] as (rule: StoredCollectionRuleItem) => SQL | undefined)(item);
}

function combineAll(match: StoredRuleMatch, items: StoredCollectionRuleItem[]) {
  const conditions = items.map(compileItem).filter(condition => condition !== undefined);
  return combine[match](conditions);
}

/** `null` means no rules (the locked "All" collection), which matches every product. */
export function compileRules(rules: StoredCollectionRules | null): SQL | undefined {
  return rules ? combineAll(rules.match, rules.rules) : undefined;
}
