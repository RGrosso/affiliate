import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { products, tags } from "hub:db:schema";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import { isUniqueViolation } from "../utils/db";
import { ALL_COLLECTION_ID, StoredCollectionStatus, StoredCollectionType } from "../utils/storedCollection";
import {
  STORED_RULES_VERSION,
  StoredRetailerOperator,
  StoredRuleMatch,
  StoredRuleType,
  StoredTagOperator,
  type StoredCollectionRules
} from "../utils/storedCollectionRules";
import { CollectionRepository, type NewCollection } from "./CollectionRepository";

let db: TestDb;
let close: () => Promise<void>;
let repo: CollectionRepository;
let authorId: string;

const unknownId = "00000000-0000-4000-8000-000000000000";

const manual = (title: string, extra: Partial<NewCollection> = {}): NewCollection => ({
  title,
  handle: title.toLowerCase().replaceAll(" ", "-"),
  type: StoredCollectionType.Manual,
  ...extra,
});

const tagRules = (...tagIds: string[]): StoredCollectionRules => ({
  version: STORED_RULES_VERSION,
  match: StoredRuleMatch.All,
  rules: tagIds.map(tagId => ({ type: StoredRuleType.Tag, operator: StoredTagOperator.Has, tagId })),
});

const automated = (title: string, rules: StoredCollectionRules): NewCollection => ({
  ...manual(title),
  type: StoredCollectionType.Automated,
  rules,
});

const addProduct = async (title: string) => {
  const [product] = await db.insert(products).values({ title, handle: title.toLowerCase(), authorId }).returning();
  return product!;
};

const addTag = async (name: string) => {
  const [tag] = await db.insert(tags).values({ name, slug: name.toLowerCase() }).returning();
  return tag!;
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  repo = new CollectionRepository(db);
});

afterAll(() => close());

beforeEach(async () => {
  await resetDb(db);
  authorId = (await insertTestUser(db)).id;
});

describe("insert and lookups", () => {
  it("stores a collection with its defaults", async () => {
    const created = await repo.insert(manual("Gifts"));

    expect(created).toMatchObject({
      title: "Gifts",
      handle: "gifts",
      status: StoredCollectionStatus.Draft,
      locked: false,
      rules: null,
      description: null,
    });
    expect(created.defaultSort).toBe("newest");
    expect(await repo.findById(created.id)).toEqual(created);
    expect(await repo.findByHandle("gifts")).toEqual(created);
  });

  it("returns undefined for an unknown id or handle", async () => {
    expect(await repo.findById(unknownId)).toBeUndefined();
    expect(await repo.findByHandle("nope")).toBeUndefined();
  });

  it("finds the locked All collection that every database starts with", async () => {
    expect(await repo.findByHandle("all")).toMatchObject({ id: ALL_COLLECTION_ID, locked: true, rules: null });
  });

  it("keeps handles unique", async () => {
    await repo.insert(manual("Gifts"));

    await expect(repo.insert(manual("Other", { handle: "gifts" }))).rejects.toSatisfy(isUniqueViolation);
  });

  it("round-trips stored rules", async () => {
    const rules: StoredCollectionRules = {
      version: STORED_RULES_VERSION,
      match: StoredRuleMatch.Any,
      rules: [{ type: StoredRuleType.Retailer, operator: StoredRetailerOperator.Is, retailer: "Etsy" }],
    };
    const created = await repo.insert(automated("Etsy finds", rules));

    expect((await repo.findById(created.id))?.rules).toEqual(rules);
  });
});

describe("findAll", () => {
  it("puts the locked collection first, then sorts by title", async () => {
    await repo.insert(manual("Zebra"));
    await repo.insert(manual("Apple"));

    expect((await repo.findAll()).map(collection => collection.title)).toEqual(["All products", "Apple", "Zebra"]);
  });
});

describe("update", () => {
  it("changes the given fields and reports whether the collection exists", async () => {
    const { id } = await repo.insert(manual("Gifts"));

    expect(await repo.update(id, { title: "Presents", status: StoredCollectionStatus.Published })).toEqual({ id });
    expect(await repo.findById(id)).toMatchObject({ title: "Presents", handle: "gifts", status: StoredCollectionStatus.Published });
    expect(await repo.update(unknownId, { title: "x" })).toBeUndefined();
  });
});

describe("delete", () => {
  it("removes the collection and its product links but not the products", async () => {
    const { id } = await repo.insert(manual("Gifts"));
    const product = await addProduct("Lamp");
    await repo.replaceProducts(id, [product.id]);

    expect(await repo.delete(id)).toBe(true);
    expect(await repo.findById(id)).toBeUndefined();
    expect(await repo.findProductIds(id)).toEqual([]);
    expect(await db.select().from(products)).toHaveLength(1);
    expect(await repo.delete(id)).toBe(false);
  });
});

describe("replaceProducts and findProductIds", () => {
  it("keeps the order given", async () => {
    const { id } = await repo.insert(manual("Gifts"));
    const [a, b, c] = [await addProduct("A"), await addProduct("B"), await addProduct("C")];

    await repo.replaceProducts(id, [c.id, a.id, b.id]);
    expect(await repo.findProductIds(id)).toEqual([c.id, a.id, b.id]);
  });

  it("replaces the previous products, ignores repeats and can clear them", async () => {
    const { id } = await repo.insert(manual("Gifts"));
    const [a, b] = [await addProduct("A"), await addProduct("B")];
    await repo.replaceProducts(id, [a.id, b.id]);

    await repo.replaceProducts(id, [b.id, b.id]);
    expect(await repo.findProductIds(id)).toEqual([b.id]);

    await repo.replaceProducts(id, []);
    expect(await repo.findProductIds(id)).toEqual([]);
  });

  it("leaves other collections alone", async () => {
    const first = await repo.insert(manual("First"));
    const second = await repo.insert(manual("Second"));
    const product = await addProduct("A");
    await repo.replaceProducts(first.id, [product.id]);
    await repo.replaceProducts(second.id, [product.id]);

    await repo.replaceProducts(first.id, []);
    expect(await repo.findProductIds(second.id)).toEqual([product.id]);
  });

  it("drops a product from every collection when the product is deleted", async () => {
    const { id } = await repo.insert(manual("Gifts"));
    const product = await addProduct("A");
    await repo.replaceProducts(id, [product.id]);

    await db.delete(products);
    expect(await repo.findProductIds(id)).toEqual([]);
  });
});

describe("countProducts", () => {
  it("counts the hand-picked products per collection", async () => {
    const first = await repo.insert(manual("First"));
    const second = await repo.insert(manual("Second"));
    const [a, b] = [await addProduct("A"), await addProduct("B")];
    await repo.replaceProducts(first.id, [a.id, b.id]);
    await repo.replaceProducts(second.id, [a.id]);

    const counts = await repo.countProducts();
    expect(counts.get(first.id)).toBe(2);
    expect(counts.get(second.id)).toBe(1);
    expect(counts.has(ALL_COLLECTION_ID)).toBe(false);
  });
});

describe("findUsingTag and findUsingTags", () => {
  it("finds collections whose rules mention the tag, including in subgroups", async () => {
    const [wedding, other] = [await addTag("Wedding"), await addTag("Other")];
    const direct = await repo.insert(automated("Direct", tagRules(wedding.id)));
    const grouped = await repo.insert(automated("Grouped", {
      version: STORED_RULES_VERSION,
      match: StoredRuleMatch.All,
      rules: [{
        type: StoredRuleType.Group,
        match: StoredRuleMatch.Any,
        rules: [{ type: StoredRuleType.Tag, operator: StoredTagOperator.HasNot, tagId: wedding.id }],
      }],
    }));
    await repo.insert(automated("Other only", tagRules(other.id)));
    await repo.insert(manual("Manual"));

    expect(await repo.findUsingTag(wedding.id)).toEqual([
      { id: direct.id, title: "Direct" },
      { id: grouped.id, title: "Grouped" },
    ]);
  });

  it("is empty for a tag that no collection uses", async () => {
    const tag = await addTag("Unused");
    await repo.insert(automated("Other", tagRules(unknownId)));

    expect(await repo.findUsingTag(tag.id)).toEqual([]);
  });

  it("groups several tags at once and skips unused ones", async () => {
    const [a, b, c] = [await addTag("A"), await addTag("B"), await addTag("C")];
    const both = await repo.insert(automated("Both", tagRules(a.id, b.id)));
    const onlyB = await repo.insert(automated("Only B", tagRules(b.id)));

    const usage = await repo.findUsingTags([a.id, b.id, c.id]);
    expect(usage.get(a.id)).toEqual([{ id: both.id, title: "Both" }]);
    expect(usage.get(b.id)).toEqual([{ id: both.id, title: "Both" }, { id: onlyB.id, title: "Only B" }]);
    expect(usage.has(c.id)).toBe(false);
    expect((await repo.findUsingTags([])).size).toBe(0);
  });

  it("ignores the All collection, which has no rules", async () => {
    const tag = await addTag("A");

    expect(await repo.findUsingTag(tag.id)).toEqual([]);
  });
});
