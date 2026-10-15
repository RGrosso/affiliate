import { z } from "#shared/schemas/zod";

// These values are persisted in `collections.rules`. Changing one needs a data migration
// plus a new version handled in `parseStoredRules`. The API's values live in `shared/types/collectionRules.ts`.
export const STORED_RULES_VERSION = 1;

export const StoredRuleType = { Tag: "tag", Retailer: "retailer", Group: "group" } as const;
export const StoredTagOperator = { Has: "has", HasNot: "has_not" } as const;
export const StoredRetailerOperator = { Is: "is", IsNot: "is_not" } as const;
export const StoredRuleMatch = { All: "all", Any: "any" } as const;

export type StoredRuleType = (typeof StoredRuleType)[keyof typeof StoredRuleType];
export type StoredTagOperator = (typeof StoredTagOperator)[keyof typeof StoredTagOperator];
export type StoredRetailerOperator = (typeof StoredRetailerOperator)[keyof typeof StoredRetailerOperator];
export type StoredRuleMatch = (typeof StoredRuleMatch)[keyof typeof StoredRuleMatch];

const storedTagRule = z.object({
  type: z.literal(StoredRuleType.Tag),
  operator: z.enum(StoredTagOperator),
  tagId: z.uuid(),
});

const storedRetailerRule = z.object({
  type: z.literal(StoredRuleType.Retailer),
  operator: z.enum(StoredRetailerOperator),
  retailer: z.string().min(1),
});

const storedGroup = z.object({
  type: z.literal(StoredRuleType.Group),
  match: z.enum(StoredRuleMatch),
  rules: z.array(z.discriminatedUnion("type", [storedTagRule, storedRetailerRule])).min(1),
});

const storedRulesV1 = z.object({
  version: z.literal(1),
  match: z.enum(StoredRuleMatch),
  rules: z.array(z.discriminatedUnion("type", [storedTagRule, storedRetailerRule, storedGroup])).min(1),
});

export type StoredTagRule = z.infer<typeof storedTagRule>;
export type StoredRetailerRule = z.infer<typeof storedRetailerRule>;
export type StoredRuleSubgroup = z.infer<typeof storedGroup>;
export type StoredCollectionRule = StoredTagRule | StoredRetailerRule;
export type StoredCollectionRuleItem = StoredCollectionRule | StoredRuleSubgroup;
export type StoredCollectionRules = z.infer<typeof storedRulesV1>;

/** The JSON key holding a tag's id, for queries that look inside `collections.rules`. The `satisfies` fails if the key is renamed. */
export const STORED_TAG_ID_KEY = "tagId" satisfies keyof StoredTagRule;

/** Validates JSON read from the database. Upgrade older versions to the latest shape here. */
export function parseStoredRules(value: unknown): StoredCollectionRules {
  const version = typeof value === "object" && value !== null && "version" in value ? value.version : undefined;

  switch (version) {
    case 1: {
      const result = storedRulesV1.safeParse(value);
      if (!result.success) {
        throw new Error(`Stored collection rules are invalid: ${z.prettifyError(result.error)}`);
      }
      return result.data;
    }
    default:
      throw new Error(`Unsupported stored collection rules version: ${String(version)}`);
  }
}
