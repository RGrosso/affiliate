import { describe, expect, it } from "vitest";
import {
  RetailerOperator,
  RuleMatch,
  RuleType,
  TagOperator,
  type CollectionRules
} from "../types/collectionRules";
import { countConditions, describeRules } from "./collectionRules";

const wedding = "11111111-1111-4111-8111-111111111111";
const names = new Map([[wedding, "Wedding"]]);
const unknownTag = "22222222-2222-4222-8222-222222222222";

const tag = (operator: TagOperator, tagId = wedding) => ({ type: RuleType.Tag, operator, tagId }) as const;
const retailer = (operator: RetailerOperator, name: string) => ({ type: RuleType.Retailer, operator, retailer: name }) as const;

describe("describeRules", () => {
  it("describes a single tag condition", () => {
    const rules: CollectionRules = { match: RuleMatch.All, rules: [tag(TagOperator.Has)] };
    expect(describeRules(rules, names)).toBe("Has the tag “Wedding”");
  });

  it("describes the negative tag condition", () => {
    const rules: CollectionRules = { match: RuleMatch.All, rules: [tag(TagOperator.HasNot)] };
    expect(describeRules(rules, names)).toBe("Doesn’t have the tag “Wedding”");
  });

  it("describes both retailer operators", () => {
    const is: CollectionRules = { match: RuleMatch.All, rules: [retailer(RetailerOperator.Is, "Etsy")] };
    const isNot: CollectionRules = { match: RuleMatch.All, rules: [retailer(RetailerOperator.IsNot, "Etsy")] };
    expect(describeRules(is, names)).toBe("Retailer is Etsy");
    expect(describeRules(isNot, names)).toBe("Retailer isn’t Etsy");
  });

  it("joins conditions with “and” for all and “or” for any", () => {
    const rules = [tag(TagOperator.Has), retailer(RetailerOperator.IsNot, "Etsy")];
    expect(describeRules({ match: RuleMatch.All, rules }, names)).toBe("Has the tag “Wedding” and retailer isn’t Etsy");
    expect(describeRules({ match: RuleMatch.Any, rules }, names)).toBe("Has the tag “Wedding” or retailer isn’t Etsy");
  });

  it("puts subgroups in brackets", () => {
    const rules: CollectionRules = {
      match: RuleMatch.All,
      rules: [
        tag(TagOperator.Has),
        {
          type: RuleType.Group,
          match: RuleMatch.Any,
          rules: [retailer(RetailerOperator.Is, "Amazon"), retailer(RetailerOperator.Is, "Etsy")],
        },
      ],
    };
    expect(describeRules(rules, names)).toBe("Has the tag “Wedding” and (retailer is Amazon or retailer is Etsy)");
  });

  it("leaves the brackets off a subgroup with one condition", () => {
    const rules: CollectionRules = {
      match: RuleMatch.Any,
      rules: [tag(TagOperator.Has), { type: RuleType.Group, match: RuleMatch.All, rules: [retailer(RetailerOperator.Is, "Etsy")] }],
    };
    expect(describeRules(rules, names)).toBe("Has the tag “Wedding” or retailer is Etsy");
  });

  it("calls a tag that no longer exists a deleted tag", () => {
    expect(describeRules({ match: RuleMatch.All, rules: [tag(TagOperator.Has, unknownTag)] }, names)).toBe("Has a deleted tag");
    expect(describeRules({ match: RuleMatch.All, rules: [tag(TagOperator.HasNot, unknownTag)] }, names)).toBe("Doesn’t have a deleted tag");
  });

  it("copes with no conditions", () => {
    expect(describeRules({ match: RuleMatch.All, rules: [] }, names)).toBe("No conditions");
  });
});

describe("countConditions", () => {
  it("counts root conditions and those inside subgroups, but not the groups", () => {
    const rules: CollectionRules = {
      match: RuleMatch.All,
      rules: [
        tag(TagOperator.Has),
        { type: RuleType.Group, match: RuleMatch.Any, rules: [retailer(RetailerOperator.Is, "A"), retailer(RetailerOperator.Is, "B")] },
      ],
    };
    expect(countConditions(rules)).toBe(3);
  });

  it("is zero for an empty collection", () => {
    expect(countConditions({ match: RuleMatch.All, rules: [] })).toBe(0);
  });
});
