import { describe, expect, it } from "vitest";
import { RetailerOperator, RuleMatch, RuleType, TagOperator, type CollectionRules } from "#shared/types/collectionRules";
import { fromStoredRules, toStoredRules } from "./collectionRulesMapper";
import { parseStoredRules, type StoredCollectionRules } from "./storedCollectionRules";

const tagId = "11111111-1111-4111-8111-111111111111";

const apiTag = (operator: TagOperator) => ({ type: RuleType.Tag, operator, tagId }) as const;
const apiRetailer = (operator: RetailerOperator) => ({ type: RuleType.Retailer, operator, retailer: "Etsy" }) as const;

describe("toStoredRules", () => {
  it.each([
    [TagOperator.Has, "has"],
    [TagOperator.HasNot, "has_not"],
  ] as const)("stores the tag operator %s as %s", (operator, stored) => {
    expect(toStoredRules({ match: RuleMatch.All, rules: [apiTag(operator)] })).toEqual({
      version: 1,
      match: "all",
      rules: [{ type: "tag", operator: stored, tagId }],
    });
  });

  it.each([
    [RetailerOperator.Is, "is"],
    [RetailerOperator.IsNot, "is_not"],
  ] as const)("stores the retailer operator %s as %s", (operator, stored) => {
    expect(toStoredRules({ match: RuleMatch.Any, rules: [apiRetailer(operator)] })).toEqual({
      version: 1,
      match: "any",
      rules: [{ type: "retailer", operator: stored, retailer: "Etsy" }],
    });
  });

  it("stores nested groups", () => {
    const rules: CollectionRules = {
      match: RuleMatch.All,
      rules: [{ type: RuleType.Group, match: RuleMatch.Any, rules: [apiTag(TagOperator.HasNot), apiRetailer(RetailerOperator.IsNot)] }],
    };
    expect(toStoredRules(rules)).toEqual({
      version: 1,
      match: "all",
      rules: [{
        type: "group",
        match: "any",
        rules: [
          { type: "tag", operator: "has_not", tagId },
          { type: "retailer", operator: "is_not", retailer: "Etsy" },
        ],
      }],
    });
  });
});

describe("fromStoredRules", () => {
  it.each([
    ["has", TagOperator.Has],
    ["has_not", TagOperator.HasNot],
  ] as const)("reads the stored tag operator %s as %s", (stored, operator) => {
    const input: StoredCollectionRules = { version: 1, match: "all", rules: [{ type: "tag", operator: stored, tagId }] };
    expect(fromStoredRules(input)).toEqual({ match: RuleMatch.All, rules: [apiTag(operator)] });
  });

  it.each([
    ["is", RetailerOperator.Is],
    ["is_not", RetailerOperator.IsNot],
  ] as const)("reads the stored retailer operator %s as %s", (stored, operator) => {
    const input: StoredCollectionRules = { version: 1, match: "any", rules: [{ type: "retailer", operator: stored, retailer: "Etsy" }] };
    expect(fromStoredRules(input)).toEqual({ match: RuleMatch.Any, rules: [apiRetailer(operator)] });
  });

  it("reads nested groups", () => {
    const input: StoredCollectionRules = {
      version: 1,
      match: "any",
      rules: [{ type: "group", match: "all", rules: [{ type: "tag", operator: "has", tagId }] }],
    };
    expect(fromStoredRules(input)).toEqual({
      match: RuleMatch.Any,
      rules: [{ type: RuleType.Group, match: RuleMatch.All, rules: [apiTag(TagOperator.Has)] }],
    });
  });
});

describe("round trip", () => {
  const rules: CollectionRules = {
    match: RuleMatch.All,
    rules: [
      apiTag(TagOperator.Has),
      apiRetailer(RetailerOperator.IsNot),
      { type: RuleType.Group, match: RuleMatch.Any, rules: [apiTag(TagOperator.HasNot), apiRetailer(RetailerOperator.Is)] },
    ],
  };

  it("returns the same rules after storing and reading them", () => {
    expect(fromStoredRules(toStoredRules(rules))).toEqual(rules);
  });

  it("stores something the parser accepts", () => {
    const stored = toStoredRules(rules);
    expect(parseStoredRules(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });
});
