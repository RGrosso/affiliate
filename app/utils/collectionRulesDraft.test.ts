import { describe, expect, it } from "vitest";
import { RetailerOperator, RuleMatch, RuleType, TagOperator, type CollectionRules } from "#shared/types/collectionRules";
import { changeConditionType, newCondition, newDraftRules, newGroup, toDraftRules, toRules } from "./collectionRulesDraft";

const TAG_ID = "0b6e2f1c-8a4d-4f7e-9c1a-3d5b7e9f1a2b";

const rules: CollectionRules = {
  match: RuleMatch.Any,
  rules: [
    { type: RuleType.Tag, operator: TagOperator.HasNot, tagId: TAG_ID },
    {
      type: RuleType.Group,
      match: RuleMatch.All,
      rules: [
        { type: RuleType.Retailer, operator: RetailerOperator.Is, retailer: "Amazon" },
        { type: RuleType.Tag, operator: TagOperator.Has, tagId: TAG_ID },
      ],
    },
  ],
};

describe("collection rules draft", () => {
  it("round-trips rules without leaving any client-side fields behind", () => {
    expect(toRules(toDraftRules(rules))).toEqual(rules);
  });

  it("gives every row and group its own key", () => {
    const draft = toDraftRules(rules);
    const group = draft.rules[1]!;
    const keys = [draft.rules[0]!.key, group.key, ...(group.type === RuleType.Group ? group.rules.map(rule => rule.key) : [])];

    expect(new Set(keys).size).toBe(4);
  });

  it("starts a new collection with one empty tag condition", () => {
    const draft = newDraftRules();

    expect(draft.match).toBe(RuleMatch.All);
    expect(draft.rules).toHaveLength(1);
    expect(draft.rules[0]).toMatchObject({ type: RuleType.Tag, operator: TagOperator.Has, tagId: "" });
  });

  it("starts a group with one empty condition", () => {
    expect(newGroup()).toMatchObject({ type: RuleType.Group, match: RuleMatch.All, rules: [{ type: RuleType.Tag }] });
  });

  it("resets the operator and value when a row changes type, keeping its key", () => {
    const row = { ...newCondition(), operator: TagOperator.HasNot, tagId: TAG_ID };
    const changed = changeConditionType(row, RuleType.Retailer);

    expect(changed).toMatchObject({ key: row.key, type: RuleType.Retailer, operator: RetailerOperator.Is, tagId: "", retailer: "" });
  });

  it("sends only the fields of the row's type", () => {
    const retailer = { ...newCondition(RuleType.Retailer), retailer: "Argos", tagId: TAG_ID };

    expect(toRules({ match: RuleMatch.All, rules: [retailer] }).rules[0]).toEqual({
      type: RuleType.Retailer,
      operator: RetailerOperator.Is,
      retailer: "Argos",
    });
  });
});
