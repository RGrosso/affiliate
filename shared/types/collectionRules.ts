// The API and form shape of collection rules. Stored values are defined separately in `server/`
// (see `server/utils/storedCollectionRules.ts`), so they can change with a migration without touching this.
export const RuleMatch = { All: "all", Any: "any" } as const;
export const RuleType = { Tag: "tag", Retailer: "retailer", Group: "group" } as const;
export const TagOperator = { Has: "has", HasNot: "hasNot" } as const;
export const RetailerOperator = { Is: "is", IsNot: "isNot" } as const;

export type RuleMatch = (typeof RuleMatch)[keyof typeof RuleMatch];
export type RuleType = (typeof RuleType)[keyof typeof RuleType];
export type TagOperator = (typeof TagOperator)[keyof typeof TagOperator];
export type RetailerOperator = (typeof RetailerOperator)[keyof typeof RetailerOperator];

export type TagRule = {
  type: typeof RuleType.Tag;
  operator: TagOperator;
  tagId: string;
};

export type RetailerRule = {
  type: typeof RuleType.Retailer;
  operator: RetailerOperator;
  retailer: string;
};

export type CollectionRule = TagRule | RetailerRule;

/** Holds conditions only, so rules nest two levels deep at most. */
export type RuleSubgroup = {
  type: typeof RuleType.Group;
  match: RuleMatch;
  rules: CollectionRule[];
};

export type CollectionRuleItem = CollectionRule | RuleSubgroup;

export type CollectionRules = {
  match: RuleMatch;
  rules: CollectionRuleItem[];
};
