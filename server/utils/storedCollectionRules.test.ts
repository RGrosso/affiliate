import { describe, expect, it } from "vitest";
import {
  parseStoredRules,
  STORED_RULES_VERSION,
  StoredRetailerOperator,
  StoredRuleMatch,
  StoredRuleType,
  StoredTagOperator
} from "./storedCollectionRules";

const tagId = "11111111-1111-4111-8111-111111111111";

// These values are already in people's databases. If a snapshot here fails, you need a data migration, not a new snapshot.
describe("stored value contract", () => {
  it("keeps the stored rule types", () => {
    expect(StoredRuleType).toMatchInlineSnapshot(`
      {
        "Group": "group",
        "Retailer": "retailer",
        "Tag": "tag",
      }
    `);
  });

  it("keeps the stored tag operators", () => {
    expect(StoredTagOperator).toMatchInlineSnapshot(`
      {
        "Has": "has",
        "HasNot": "has_not",
      }
    `);
  });

  it("keeps the stored retailer operators", () => {
    expect(StoredRetailerOperator).toMatchInlineSnapshot(`
      {
        "Is": "is",
        "IsNot": "is_not",
      }
    `);
  });

  it("keeps the stored match values", () => {
    expect(StoredRuleMatch).toMatchInlineSnapshot(`
      {
        "All": "all",
        "Any": "any",
      }
    `);
  });

  it("keeps the stored version", () => {
    expect(STORED_RULES_VERSION).toBe(1);
  });
});

describe("parseStoredRules", () => {
  const valid = {
    version: 1,
    match: "all",
    rules: [
      { type: "tag", operator: "has_not", tagId },
      { type: "group", match: "any", rules: [{ type: "retailer", operator: "is_not", retailer: "Etsy" }] },
    ],
  };

  it("returns valid version 1 rules", () => {
    expect(parseStoredRules(valid)).toEqual(valid);
  });

  it("drops fields it doesn't know about", () => {
    expect(parseStoredRules({ ...valid, extra: true })).toEqual(valid);
  });

  it("throws on a missing or unknown version", () => {
    const { version: _version, ...unversioned } = valid;
    expect(() => parseStoredRules(unversioned)).toThrow("Unsupported stored collection rules version: undefined");
    expect(() => parseStoredRules({ ...valid, version: 2 })).toThrow("Unsupported stored collection rules version: 2");
    expect(() => parseStoredRules(null)).toThrow("Unsupported stored collection rules version");
    expect(() => parseStoredRules("rules")).toThrow("Unsupported stored collection rules version");
  });

  it("throws a plain Error on invalid data", () => {
    expect(() => parseStoredRules({ ...valid, match: "some" })).toThrow(Error);
    expect(() => parseStoredRules({ ...valid, match: "some" })).toThrow("Stored collection rules are invalid");
  });

  it("throws on API-style operator names, which are never stored", () => {
    expect(() => parseStoredRules({ ...valid, rules: [{ type: "tag", operator: "hasNot", tagId }] })).toThrow("invalid");
  });

  it("throws on empty rules, a nested group or a bad tag id", () => {
    expect(() => parseStoredRules({ ...valid, rules: [] })).toThrow("invalid");
    const nested = { type: "group", match: "all", rules: [{ type: "group", match: "all", rules: [] }] };
    expect(() => parseStoredRules({ ...valid, rules: [nested] })).toThrow("invalid");
    expect(() => parseStoredRules({ ...valid, rules: [{ type: "tag", operator: "has", tagId: "nope" }] })).toThrow("invalid");
  });
});
