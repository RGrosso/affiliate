import { and, eq, exists, inArray, isNull, ne, notExists, or, type SQL } from "drizzle-orm";
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

// Drizzle renders `inArray` with no values as a condition nothing matches
const matchNothing = () => inArray(products.id, []);

const combine: Record<StoredRuleMatch, (conditions: SQL[]) => SQL | undefined> = {
  [StoredRuleMatch.All]: conditions => and(...conditions),
  // `or()` of nothing is no condition at all, which would match every product
  [StoredRuleMatch.Any]: conditions => (conditions.length ? or(...conditions) : matchNothing()),
};

/** `null` (the locked "All" collection) matches every product. */
export function compileRules(db: DbExecutor, rules: StoredCollectionRules | null): SQL | undefined {
  const productHasTag = (tagId: string) =>
    db
      .select({ one: productTags.productId })
      .from(productTags)
      .where(and(eq(productTags.productId, products.id), eq(productTags.tagId, tagId)));

  const tagConditions: Record<StoredTagOperator, (tagId: string) => SQL> = {
    [StoredTagOperator.Has]: tagId => exists(productHasTag(tagId)),
    [StoredTagOperator.HasNot]: tagId => notExists(productHasTag(tagId)),
  };

  // Exact and case-sensitive on purpose: retailers are picked from a list. "Is not" keeps products with no retailer.
  const retailerConditions: Record<StoredRetailerOperator, (retailer: string) => SQL | undefined> = {
    [StoredRetailerOperator.Is]: retailer => eq(products.retailer, retailer),
    [StoredRetailerOperator.IsNot]: retailer => or(isNull(products.retailer), ne(products.retailer, retailer)),
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

  return rules ? combineAll(rules.match, rules.rules) : undefined;
}
