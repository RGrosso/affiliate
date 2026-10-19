import { CollectionStatus, CollectionType, ProductSort } from "#shared/types/collection";
import { RetailerOperator, RuleMatch, RuleType, TagOperator } from "#shared/types/collectionRules";

// Record types make TypeScript flag a new value that is missing a label

export const collectionTypeLabels: Record<CollectionType, string> = {
  [CollectionType.Manual]: "Hand-picked",
  [CollectionType.Automated]: "Automatic",
};

export const collectionStatusLabels: Record<CollectionStatus, string> = {
  [CollectionStatus.Draft]: "Draft",
  [CollectionStatus.Published]: "Live",
};

export const productSortLabels: Record<ProductSort, string> = {
  [ProductSort.Manual]: "Featured (manual order)",
  [ProductSort.Newest]: "Newest first",
  [ProductSort.Oldest]: "Oldest first",
  [ProductSort.PriceAsc]: "Price: low to high",
  [ProductSort.PriceDesc]: "Price: high to low",
  [ProductSort.TitleAsc]: "Title: A to Z",
  [ProductSort.TitleDesc]: "Title: Z to A",
};

export const ruleMatchLabels: Record<RuleMatch, string> = {
  [RuleMatch.All]: "all",
  [RuleMatch.Any]: "any",
};

export const conditionTypeLabels: Record<Exclude<RuleType, typeof RuleType.Group>, string> = {
  [RuleType.Tag]: "Tag",
  [RuleType.Retailer]: "Retailer",
};

export const conditionOperatorItems: Record<Exclude<RuleType, typeof RuleType.Group>, { label: string; value: TagOperator | RetailerOperator }[]> = {
  [RuleType.Tag]: [
    { label: "has", value: TagOperator.Has },
    { label: "doesn't have", value: TagOperator.HasNot },
  ],
  [RuleType.Retailer]: [
    { label: "is", value: RetailerOperator.Is },
    { label: "isn't", value: RetailerOperator.IsNot },
  ],
};

/** Options for a `USelect`. Manual order only makes sense when the admin picks the products. */
export function sortItems(type: CollectionType) {
  return Object.values(ProductSort)
    .filter(sort => sort !== ProductSort.Manual || type === CollectionType.Manual)
    .map(sort => ({ label: productSortLabels[sort], value: sort }));
}
