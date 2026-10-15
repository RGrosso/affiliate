import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { productTags, tags } from "hub:db:schema";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import type { StoredCollectionRuleItem, StoredCollectionRules } from "../utils/storedCollectionRules";
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

const tagRule = (operator: "has" | "has_not", tagId: string) => ({ type: "tag", operator, tagId }) as const;
const retailerRule = (operator: "is" | "is_not", retailer: string) => ({ type: "retailer", operator, retailer }) as const;
const group = (match: "all" | "any", ...rules: Extract<StoredCollectionRuleItem, { type: "tag" | "retailer" }>[]) =>
  ({ type: "group", match, rules }) as const;
const all = (...rules: StoredCollectionRuleItem[]): StoredCollectionRules => ({ version: 1, match: "all", rules });
const any = (...rules: StoredCollectionRuleItem[]): StoredCollectionRules => ({ version: 1, match: "any", rules });

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
  const rows = await db.insert(tags).values([
    { name: "Wedding", slug: "wedding" },
    { name: "Gift", slug: "gift" },
    { name: "Unused", slug: "unused" },
  ]).returning();
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
    expect(compileRules(null)).toBeUndefined();
  });

  it("matches every product for null rules", async () => {
    expect(await titlesFor(null)).toEqual(["Book", "Lamp", "Mug", "Pen", "Ring", "Vase"]);
  });

  it("keeps the existing behaviour when no rules are passed", async () => {
    const result = await repo.findPage({ page: 1, pageSize: 50 });
    expect(result.total).toBe(6);
  });
});

describe("tag rules", () => {
  it("has: matches products with the tag", async () => {
    expect(await titlesFor(all(tagRule("has", wedding)))).toEqual(["Ring", "Vase"]);
  });

  it("has_not: matches products without the tag, including untagged ones", async () => {
    expect(await titlesFor(all(tagRule("has_not", wedding)))).toEqual(["Book", "Lamp", "Mug", "Pen"]);
  });

  it("has a tag nobody uses: matches nothing", async () => {
    expect(await titlesFor(all(tagRule("has", unused)))).toEqual([]);
  });

  it("has_not a tag nobody uses: matches everything", async () => {
    expect(await titlesFor(all(tagRule("has_not", unused)))).toHaveLength(6);
  });

  it("has an unknown tag id: matches nothing", async () => {
    expect(await titlesFor(all(tagRule("has", unknownId)))).toEqual([]);
  });

  it("has_not an unknown tag id: matches everything", async () => {
    expect(await titlesFor(all(tagRule("has_not", unknownId)))).toHaveLength(6);
  });
});

describe("retailer rules", () => {
  it("is: matches the exact retailer", async () => {
    expect(await titlesFor(all(retailerRule("is", "Amazon")))).toEqual(["Lamp", "Vase"]);
  });

  it("is: is case-sensitive", async () => {
    expect(await titlesFor(all(retailerRule("is", "Etsy")))).toEqual(["Ring"]);
    expect(await titlesFor(all(retailerRule("is", "etsy")))).toEqual(["Mug"]);
    expect(await titlesFor(all(retailerRule("is", "ETSY")))).toEqual([]);
  });

  it("is: never matches a product with no retailer", async () => {
    expect(await titlesFor(all(retailerRule("is", "Book")))).toEqual([]);
  });

  it("is_not: includes products with no retailer", async () => {
    expect(await titlesFor(all(retailerRule("is_not", "Amazon")))).toEqual(["Book", "Mug", "Pen", "Ring"]);
  });

  it("is_not: is case-sensitive too", async () => {
    expect(await titlesFor(all(retailerRule("is_not", "Etsy")))).toEqual(["Book", "Lamp", "Mug", "Pen", "Vase"]);
  });

  it("treats a retailer containing LIKE wildcards literally", async () => {
    expect(await titlesFor(all(retailerRule("is", "%")))).toEqual([]);
    expect(await titlesFor(all(retailerRule("is_not", "%")))).toHaveLength(6);
  });
});

describe("match", () => {
  it("all: needs every condition", async () => {
    expect(await titlesFor(all(tagRule("has", wedding), retailerRule("is", "Etsy")))).toEqual(["Ring"]);
    expect(await titlesFor(all(tagRule("has", wedding), tagRule("has", gift)))).toEqual(["Ring"]);
  });

  it("any: needs one condition", async () => {
    expect(await titlesFor(any(tagRule("has", wedding), retailerRule("is", "Argos")))).toEqual(["Pen", "Ring", "Vase"]);
  });

  it("any: with a single condition behaves like all", async () => {
    expect(await titlesFor(any(tagRule("has", gift)))).toEqual(await titlesFor(all(tagRule("has", gift))));
  });
});

describe("subgroups", () => {
  it("nests an any group inside all", async () => {
    const rules = all(tagRule("has", gift), group("any", retailerRule("is", "Etsy"), retailerRule("is", "etsy")));
    expect(await titlesFor(rules)).toEqual(["Mug", "Ring"]);
  });

  it("nests an all group inside any", async () => {
    const rules = any(
      retailerRule("is", "Argos"),
      group("all", tagRule("has", wedding), retailerRule("is", "Amazon"))
    );
    expect(await titlesFor(rules)).toEqual(["Pen", "Vase"]);
  });

  it("handles several groups with negative conditions", async () => {
    const rules = all(
      group("any", tagRule("has", wedding), tagRule("has", gift)),
      group("all", retailerRule("is_not", "Etsy"), tagRule("has_not", unused))
    );
    expect(await titlesFor(rules)).toEqual(["Book", "Mug", "Vase"]);
  });
});

describe("findPage with rules", () => {
  it("combines rules with the tag filter", async () => {
    expect(await titlesFor(all(retailerRule("is_not", "Etsy")), ["gift"])).toEqual(["Book", "Mug"]);
    expect(await titlesFor(any(retailerRule("is", "Amazon")), ["gift"])).toEqual([]);
  });

  it("reports a total that ignores pagination but respects the rules", async () => {
    const rules = all(tagRule("has", gift));
    const first = await repo.findPage({ page: 1, pageSize: 2 }, { rules });
    const second = await repo.findPage({ page: 2, pageSize: 2 }, { rules });

    expect(first.items.map(item => item.title)).toEqual(["Ring", "Mug"]);
    expect(second.items.map(item => item.title)).toEqual(["Book"]);
    expect(first.total).toBe(3);
    expect(second.total).toBe(3);
  });

  it("returns an empty page when nothing matches", async () => {
    expect(await repo.findPage({ page: 1, pageSize: 10 }, { rules: all(tagRule("has", unknownId)) })).toEqual({ items: [], total: 0 });
  });

  it("treats null rules like no rules", async () => {
    expect((await repo.findPage({ page: 1, pageSize: 10 }, { rules: null })).total).toBe(6);
  });
});
