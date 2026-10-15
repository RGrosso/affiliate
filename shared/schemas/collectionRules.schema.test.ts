import { describe, expect, it } from "vitest";
import { collectionRulesSchema } from "./collectionRules.schema";
import { z } from "./zod";

const tagId = "11111111-1111-4111-8111-111111111111";
const tagRule = { type: "tag", operator: "has", tagId };
const retailerRule = { type: "retailer", operator: "is", retailer: "Etsy" };

const messages = (input: unknown) => {
  const result = collectionRulesSchema.safeParse(input);
  if (result.success) throw new Error("Expected validation to fail");
  return result.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }));
};

const manyRules = (count: number) => Array.from({ length: count }, () => retailerRule);

describe("collectionRulesSchema", () => {
  it("accepts a flat list of conditions", () => {
    const input = { match: "all", rules: [tagRule, retailerRule] };
    expect(collectionRulesSchema.parse(input)).toEqual(input);
  });

  it("accepts a subgroup of conditions", () => {
    const input = {
      match: "all",
      rules: [tagRule, { type: "group", match: "any", rules: [retailerRule, { ...tagRule, operator: "hasNot" }] }],
    };
    expect(collectionRulesSchema.parse(input)).toEqual(input);
  });

  it("trims the retailer", () => {
    const parsed = collectionRulesSchema.parse({ match: "any", rules: [{ ...retailerRule, retailer: "  Etsy " }] });
    expect(parsed.rules[0]).toMatchObject({ retailer: "Etsy" });
  });

  it("needs at least one condition", () => {
    expect(messages({ match: "all", rules: [] })).toEqual([{ path: "rules", message: "Add at least one condition" }]);
    expect(messages({ match: "all" })).toEqual([{ path: "rules", message: "Add at least one condition" }]);
  });

  it("needs at least one condition in each group", () => {
    expect(messages({ match: "all", rules: [{ type: "group", match: "any", rules: [] }] })).toEqual([
      { path: "rules.0.rules", message: "Each group needs at least one condition" },
    ]);
  });

  it("allows 20 items in a group and rejects 21", () => {
    expect(collectionRulesSchema.safeParse({ match: "all", rules: manyRules(20) }).success).toBe(true);
    expect(messages({ match: "all", rules: manyRules(21) })).toEqual([
      { path: "rules", message: "A collection can have at most 20 items at the top level" },
    ]);
    expect(messages({ match: "all", rules: [{ type: "group", match: "any", rules: manyRules(21) }] })).toEqual([
      { path: "rules.0.rules", message: "A group can have at most 20 items" },
    ]);
  });

  it("counts conditions across subgroups towards the 50 limit", () => {
    const group = { type: "group", match: "any", rules: manyRules(20) };
    const atLimit = { match: "all", rules: [group, group, { type: "group", match: "any", rules: manyRules(10) }] };
    expect(collectionRulesSchema.safeParse(atLimit).success).toBe(true);

    const overLimit = { match: "all", rules: [group, group, { type: "group", match: "any", rules: manyRules(10) }, retailerRule] };
    expect(messages(overLimit)).toEqual([{ path: "rules", message: "A collection can have at most 50 conditions" }]);
  });

  it("doesn't allow a subgroup inside a subgroup", () => {
    const nested = { type: "group", match: "any", rules: [{ type: "group", match: "all", rules: [retailerRule] }] };
    expect(messages({ match: "all", rules: [nested] })).toEqual([
      { path: "rules.0.rules.0.type", message: "Please choose a valid condition" },
    ]);
  });

  it("rejects an unknown condition type", () => {
    expect(messages({ match: "all", rules: [{ type: "price", operator: "is", value: 1 }] })).toEqual([
      { path: "rules.0.type", message: "Please choose a valid condition" },
    ]);
    expect(messages({ match: "all", rules: ["tag"] })).toEqual([
      { path: "rules.0", message: "Please choose a valid condition" },
    ]);
  });

  it("asks for a tag from the list", () => {
    expect(messages({ match: "all", rules: [{ ...tagRule, tagId: "wedding" }] })).toEqual([
      { path: "rules.0.tagId", message: "Please choose a tag from the list" },
    ]);
    expect(messages({ match: "all", rules: [{ type: "tag", operator: "has" }] })).toEqual([
      { path: "rules.0.tagId", message: "Please choose a tag from the list" },
    ]);
  });

  it("asks for a retailer of 1 to 100 characters", () => {
    expect(messages({ match: "all", rules: [{ ...retailerRule, retailer: "  " }] })).toEqual([
      { path: "rules.0.retailer", message: "Please choose a retailer" },
    ]);
    expect(messages({ match: "all", rules: [{ type: "retailer", operator: "is" }] })).toEqual([
      { path: "rules.0.retailer", message: "Please choose a retailer" },
    ]);
    expect(messages({ match: "all", rules: [{ ...retailerRule, retailer: "x".repeat(101) }] })).toEqual([
      { path: "rules.0.retailer", message: "The retailer can be at most 100 characters" },
    ]);
    expect(collectionRulesSchema.safeParse({ match: "all", rules: [{ ...retailerRule, retailer: "x".repeat(100) }] }).success).toBe(true);
  });

  it("rejects operators that belong to the other rule type", () => {
    expect(messages({ match: "all", rules: [{ ...tagRule, operator: "is" }] })).toEqual([
      { path: "rules.0.operator", message: "Please choose whether the product has the tag or not" },
    ]);
    expect(messages({ match: "all", rules: [{ ...retailerRule, operator: "has" }] })).toEqual([
      { path: "rules.0.operator", message: "Please choose whether the retailer is or isn't the one given" },
    ]);
  });

  it("rejects stored-style operator names", () => {
    expect(messages({ match: "all", rules: [{ ...tagRule, operator: "has_not" }] })[0]?.path).toBe("rules.0.operator");
  });

  it("rejects an unknown match, at the top level and in a group", () => {
    const expected = "Please choose whether all or any of the conditions must match";
    expect(messages({ match: "some", rules: [tagRule] })).toEqual([{ path: "match", message: expected }]);
    expect(messages({ rules: [tagRule] })).toEqual([{ path: "match", message: expected }]);
    expect(messages({ match: "all", rules: [{ type: "group", match: "none", rules: [tagRule] }] })).toEqual([
      { path: "rules.0.match", message: expected },
    ]);
  });

  it("reports field errors the way the form reads them", () => {
    const result = collectionRulesSchema.safeParse({ match: "all", rules: [] });
    if (result.success) throw new Error("Expected validation to fail");
    expect(z.flattenError(result.error).fieldErrors.rules).toEqual(["Add at least one condition"]);
  });
});
