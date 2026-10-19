import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { productTags, tags } from "hub:db:schema";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import {
  STORED_RULES_VERSION,
  StoredRetailerOperator,
  StoredRuleMatch,
  StoredRuleType,
  StoredTagOperator,
  type StoredCollectionRule,
  type StoredCollectionRuleItem,
  type StoredCollectionRules,
} from "../utils/storedCollectionRules";
import { compileRules } from "./collectionRuleConditions";
import { ProductRepository } from "./ProductRepository";

let db: TestDb;
let close: () => Promise<void>;
let repo: ProductRepository;
let wedding: string;
let gift: string;
let unused: string;

const unknownId = "00000000-0000-4000-8000-000000000000";

// Ring: Etsy, wedding + gift. Vase: Amazon, wedding. Mug: "etsy", gift. Lamp: Amazon, no tags.
// Book: no retailer, gift. Pen: Argos, no tags.
const catalogue = [
  { title: "Ring", retailer: "Etsy", tags: ["wedding", "gift"] },
  { title: "Vase", retailer: "Amazon", tags: ["wedding"] },
  { title: "Mug", retailer: "etsy", tags: ["gift"] },
  { title: "Lamp", retailer: "Amazon", tags: [] },
  { title: "Book", retailer: null, tags: ["gift"] },
  { title: "Pen", retailer: "Argos", tags: [] },
] as const;

const { Has, HasNot } = StoredTagOperator;
const { Is, IsNot } = StoredRetailerOperator;

const tagRule = (operator: StoredTagOperator, tagId: string): StoredCollectionRule => ({ type: StoredRuleType.Tag, operator, tagId });
const retailerRule = (operator: StoredRetailerOperator, retailer: string): StoredCollectionRule => ({ type: StoredRuleType.Retailer, operator, retailer });
const group = (match: StoredRuleMatch, ...rules: StoredCollectionRule[]): StoredCollectionRuleItem => ({ type: StoredRuleType.Group, match, rules });
const all = (...rules: StoredCollectionRuleItem[]): StoredCollectionRules => ({ version: STORED_RULES_VERSION, match: StoredRuleMatch.All, rules });
const any = (...rules: StoredCollectionRuleItem[]): StoredCollectionRules => ({ version: STORED_RULES_VERSION, match: StoredRuleMatch.Any, rules });

async function titlesFor(rules: StoredCollectionRules | null, tag?: string[]) {
  const { items, total } = await repo.findPage({ page: 1, pageSize: 50, tag }, { rules });
  expect(total).toBe(items.length);
  return items.map(item => item.title).sort();
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  repo = new ProductRepository(db);
});

afterAll(() => close());

beforeEach(async () => {
  await resetDb(db);
  const authorId = (await insertTestUser(db)).id;
  const rows = await db
    .insert(tags)
    .values([
      { name: "Wedding", slug: "wedding" },
      { name: "Gift", slug: "gift" },
      { name: "Unused", slug: "unused" },
    ])
    .returning();
  const idBySlug = new Map(rows.map(row => [row.slug, row.id]));
  wedding = idBySlug.get("wedding")!;
  gift = idBySlug.get("gift")!;
  unused = idBySlug.get("unused")!;

  for (const [index, item] of catalogue.entries()) {
    const product = await repo.insert({
      title: item.title,
      handle: item.title.toLowerCase(),
      retailer: item.retailer,
      authorId,
      createdAt: new Date(2026, 0, 10 - index),
    });
    if (item.tags.length) {
      await db.insert(productTags).values(item.tags.map(slug => ({ productId: product.id, tagId: idBySlug.get(slug)! })));
    }
  }
});

describe("compileRules", () => {
  it("returns no condition for null rules", () => {
    expect(compileRules(db, null)).toBeUndefined();
  });

  it("matches every product for null rules", async () => {
    expect(await titlesFor(null)).toEqual(["Book", "Lamp", "Mug", "Pen", "Ring", "Vase"]);
  });
});

describe("tag rules", () => {
  it("has: matches products with the tag", async () => {
    expect(await titlesFor(all(tagRule(Has, wedding)))).toEqual(["Ring", "Vase"]);
  });

  it("has_not: matches products without the tag, including untagged ones", async () => {
    expect(await titlesFor(all(tagRule(HasNot, wedding)))).toEqual(["Book", "Lamp", "Mug", "Pen"]);
  });

  it("has a tag nobody uses: matches nothing", async () => {
    expect(await titlesFor(all(tagRule(Has, unused)))).toEqual([]);
  });

  it("has_not a tag nobody uses: matches everything", async () => {
    expect(await titlesFor(all(tagRule(HasNot, unused)))).toHaveLength(6);
  });

  it("has an unknown tag id: matches nothing", async () => {
    expect(await titlesFor(all(tagRule(Has, unknownId)))).toEqual([]);
  });

  it("has_not an unknown tag id: matches everything", async () => {
    expect(await titlesFor(all(tagRule(HasNot, unknownId)))).toHaveLength(6);
  });
});

describe("retailer rules", () => {
  it("is: matches the exact retailer", async () => {
    expect(await titlesFor(all(retailerRule(Is, "Amazon")))).toEqual(["Lamp", "Vase"]);
  });

  it("is: is case-sensitive", async () => {
    expect(await titlesFor(all(retailerRule(Is, "Etsy")))).toEqual(["Ring"]);
    expect(await titlesFor(all(retailerRule(Is, "etsy")))).toEqual(["Mug"]);
    expect(await titlesFor(all(retailerRule(Is, "ETSY")))).toEqual([]);
  });

  it("is_not: includes products with no retailer", async () => {
    expect(await titlesFor(all(retailerRule(IsNot, "Amazon")))).toEqual(["Book", "Mug", "Pen", "Ring"]);
  });

  it("is_not: is case-sensitive too", async () => {
    expect(await titlesFor(all(retailerRule(IsNot, "Etsy")))).toEqual(["Book", "Lamp", "Mug", "Pen", "Vase"]);
  });

  it("treats a retailer containing LIKE wildcards literally", async () => {
    expect(await titlesFor(all(retailerRule(Is, "%")))).toEqual([]);
    expect(await titlesFor(all(retailerRule(IsNot, "%")))).toHaveLength(6);
  });
});

describe("match", () => {
  it("all: needs every condition", async () => {
    expect(await titlesFor(all(tagRule(Has, wedding), retailerRule(Is, "Etsy")))).toEqual(["Ring"]);
    expect(await titlesFor(all(tagRule(Has, wedding), tagRule(Has, gift)))).toEqual(["Ring"]);
  });

  it("any: needs one condition", async () => {
    expect(await titlesFor(any(tagRule(Has, wedding), retailerRule(Is, "Argos")))).toEqual(["Pen", "Ring", "Vase"]);
  });

  it("any: with no conditions matches nothing", async () => {
    expect(await titlesFor(any())).toEqual([]);
  });

  it("all: with no conditions matches everything", async () => {
    expect(await titlesFor(all())).toHaveLength(6);
  });

  it("any: with a single condition behaves like all", async () => {
    expect(await titlesFor(any(tagRule(Has, gift)))).toEqual(await titlesFor(all(tagRule(Has, gift))));
  });
});

describe("subgroups", () => {
  it("nests an any group inside all", async () => {
    const rules = all(tagRule(Has, gift), group(StoredRuleMatch.Any, retailerRule(Is, "Etsy"), retailerRule(Is, "etsy")));
    expect(await titlesFor(rules)).toEqual(["Mug", "Ring"]);
  });

  it("nests an all group inside any", async () => {
    const rules = any(retailerRule(Is, "Argos"), group(StoredRuleMatch.All, tagRule(Has, wedding), retailerRule(Is, "Amazon")));
    expect(await titlesFor(rules)).toEqual(["Pen", "Vase"]);
  });

  it("handles several groups with negative conditions", async () => {
    const rules = all(
      group(StoredRuleMatch.Any, tagRule(Has, wedding), tagRule(Has, gift)),
      group(StoredRuleMatch.All, retailerRule(IsNot, "Etsy"), tagRule(HasNot, unused))
    );
    expect(await titlesFor(rules)).toEqual(["Book", "Mug", "Vase"]);
  });
});
