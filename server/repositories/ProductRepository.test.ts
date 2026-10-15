import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { collectionProducts, collections, tags, productTags } from "hub:db:schema";
import { ProductSort } from "#shared/types/collection";
import { StoredCollectionType } from "../utils/storedCollection";
import {
  STORED_RULES_VERSION,
  StoredRetailerOperator,
  StoredRuleMatch,
  StoredRuleType,
  type StoredCollectionRules
} from "../utils/storedCollectionRules";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import { ProductRepository, type NewProduct } from "./ProductRepository";

let db: TestDb;
let close: () => Promise<void>;
let repo: ProductRepository;
let authorId: string;

const unknownId = "00000000-0000-4000-8000-000000000000";

const etsyOnly: StoredCollectionRules = {
  version: STORED_RULES_VERSION,
  match: StoredRuleMatch.All,
  rules: [{ type: StoredRuleType.Retailer, operator: StoredRetailerOperator.Is, retailer: "Etsy" }],
};

const product = (title: string, extra: Partial<NewProduct> = {}): NewProduct => ({
  title,
  handle: title.toLowerCase().replaceAll(" ", "-"),
  authorId,
  ...extra,
});

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  repo = new ProductRepository(db);
});

afterAll(() => close());

beforeEach(async () => {
  await resetDb(db);
  authorId = (await insertTestUser(db)).id;
});

describe("findPage", () => {
  it("returns nothing for an empty table", async () => {
    expect(await repo.findPage({ page: 1, pageSize: 10 })).toEqual({ items: [], total: 0 });
  });

  it("orders newest first, then by title", async () => {
    const older = new Date("2026-01-01T00:00:00Z");
    const newer = new Date("2026-02-01T00:00:00Z");
    await repo.insert(product("Old", { createdAt: older }));
    await repo.insert(product("Zebra", { createdAt: newer }));
    await repo.insert(product("Apple", { createdAt: newer }));

    const { items } = await repo.findPage({ page: 1, pageSize: 10 });
    expect(items.map(item => item.title)).toEqual(["Apple", "Zebra", "Old"]);
  });

  it("breaks full ties by id", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const a = await repo.insert(product("Same", { handle: "same-1", createdAt }));
    const b = await repo.insert(product("Same", { handle: "same-2", createdAt }));

    const { items } = await repo.findPage({ page: 1, pageSize: 10 });
    expect(items.map(item => item.id)).toEqual([a.id, b.id].sort());
  });

  it("offsets by page and reports the overall total", async () => {
    for (const [index, title] of ["A", "B", "C", "D", "E"].entries()) {
      await repo.insert(product(title, { createdAt: new Date(2026, 0, 10 - index) }));
    }

    const second = await repo.findPage({ page: 2, pageSize: 2 });
    expect(second.items.map(item => item.title)).toEqual(["C", "D"]);
    expect(second.total).toBe(5);

    const last = await repo.findPage({ page: 3, pageSize: 2 });
    expect(last.items.map(item => item.title)).toEqual(["E"]);
  });

  it("returns no items but the total for a page past the end", async () => {
    await repo.insert(product("A"));
    expect(await repo.findPage({ page: 9, pageSize: 10 })).toEqual({ items: [], total: 1 });
  });
});

describe("findPage tag filter", () => {
  const tagged = async () => {
    const [deals, gifts, other] = await db.insert(tags).values([
      { name: "Deals", slug: "deals" },
      { name: "Gifts", slug: "gifts" },
      { name: "Other", slug: "other" },
    ]).returning();
    const a = await repo.insert(product("A", { createdAt: new Date(2026, 0, 3) }));
    const b = await repo.insert(product("B", { createdAt: new Date(2026, 0, 2) }));
    const c = await repo.insert(product("C", { createdAt: new Date(2026, 0, 1) }));
    await db.insert(productTags).values([
      { productId: a.id, tagId: deals!.id },
      { productId: a.id, tagId: gifts!.id },
      { productId: b.id, tagId: gifts!.id },
      { productId: c.id, tagId: other!.id },
    ]);
  };

  it("matches products with any of the tags, once each", async () => {
    await tagged();

    const result = await repo.findPage({ page: 1, pageSize: 10, tag: ["deals", "gifts"] });
    expect(result.items.map(item => item.title)).toEqual(["A", "B"]);
    expect(result.total).toBe(2);
  });

  it("filters by a single tag and ignores an empty list", async () => {
    await tagged();

    expect((await repo.findPage({ page: 1, pageSize: 10, tag: ["other"] })).items.map(item => item.title)).toEqual(["C"]);
    expect((await repo.findPage({ page: 1, pageSize: 10, tag: [] })).total).toBe(3);
    expect(await repo.findPage({ page: 1, pageSize: 10, tag: ["nope", "none"] })).toEqual({ items: [], total: 0 });
  });
});

describe("findPage sorting", () => {
  const titles = async (sort: ProductSort) => (await repo.findPage({ page: 1, pageSize: 20 }, { sort })).items.map(item => item.title);

  const seed = async () => {
    await repo.insert(product("Cheap", { pricePence: 500, createdAt: new Date(2026, 0, 2) }));
    await repo.insert(product("Dear", { pricePence: 9000, createdAt: new Date(2026, 0, 4) }));
    await repo.insert(product("Free sample", { pricePence: null, createdAt: new Date(2026, 0, 1) }));
    await repo.insert(product("apple", { pricePence: 700, createdAt: new Date(2026, 0, 3) }));
  };

  it("sorts newest and oldest by creation date", async () => {
    await seed();

    expect(await titles(ProductSort.Newest)).toEqual(["Dear", "apple", "Cheap", "Free sample"]);
    expect(await titles(ProductSort.Oldest)).toEqual(["Free sample", "Cheap", "apple", "Dear"]);
  });

  it("sorts by price with unpriced products last either way", async () => {
    await seed();

    expect(await titles(ProductSort.PriceAsc)).toEqual(["Cheap", "apple", "Dear", "Free sample"]);
    expect(await titles(ProductSort.PriceDesc)).toEqual(["Dear", "apple", "Cheap", "Free sample"]);
  });

  it("breaks price ties by title", async () => {
    await repo.insert(product("B tie", { pricePence: 500 }));
    await repo.insert(product("A tie", { pricePence: 500 }));

    expect(await titles(ProductSort.PriceAsc)).toEqual(["A tie", "B tie"]);
    expect(await titles(ProductSort.PriceDesc)).toEqual(["A tie", "B tie"]);
  });

  it("sorts by title ignoring case", async () => {
    await seed();

    expect(await titles(ProductSort.TitleAsc)).toEqual(["apple", "Cheap", "Dear", "Free sample"]);
    expect(await titles(ProductSort.TitleDesc)).toEqual(["Free sample", "Dear", "Cheap", "apple"]);
  });

  it("breaks full ties by id in every sort", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const a = await repo.insert(product("Same", { handle: "same-1", createdAt, pricePence: 100 }));
    const b = await repo.insert(product("Same", { handle: "same-2", createdAt, pricePence: 100 }));
    const expected = [a.id, b.id].sort();

    for (const sort of Object.values(ProductSort).filter(value => value !== ProductSort.Manual)) {
      const { items } = await repo.findPage({ page: 1, pageSize: 10 }, { sort });
      expect(items.map(item => item.id), sort).toEqual(expected);
    }
  });

  it("can't sort by manual order without a collection", async () => {
    await expect(repo.findPage({ page: 1, pageSize: 10 }, { sort: ProductSort.Manual })).rejects.toThrow("Manual order needs a collection");
  });
});

describe("collection scope", () => {
  const manualCollection = async (productIds: string[]) => {
    const [collection] = await db.insert(collections).values({
      title: "Hand picked",
      handle: "hand-picked",
      type: StoredCollectionType.Manual,
    }).returning();
    if (productIds.length) await db.insert(collectionProducts).values(productIds.map((productId, position) => ({ collectionId: collection!.id, productId, position })));
    return collection!.id;
  };

  it("lists only a manual collection's products, in the order they were added", async () => {
    const a = await repo.insert(product("A", { createdAt: new Date(2026, 0, 3) }));
    const b = await repo.insert(product("B", { createdAt: new Date(2026, 0, 2) }));
    const c = await repo.insert(product("C", { createdAt: new Date(2026, 0, 1) }));
    await repo.insert(product("Left out"));
    const collectionId = await manualCollection([c.id, a.id, b.id]);

    const manual = await repo.findPage({ page: 1, pageSize: 10 }, { collectionId, sort: ProductSort.Manual });
    expect(manual.items.map(item => item.title)).toEqual(["C", "A", "B"]);
    expect(manual.total).toBe(3);

    const newest = await repo.findPage({ page: 1, pageSize: 10 }, { collectionId });
    expect(newest.items.map(item => item.title)).toEqual(["A", "B", "C"]);
    expect(await repo.countMatching({ collectionId })).toBe(3);
  });

  it("pages a manual collection and combines it with a tag filter", async () => {
    const [deals] = await db.insert(tags).values({ name: "Deals", slug: "deals" }).returning();
    const a = await repo.insert(product("A"));
    const b = await repo.insert(product("B"));
    const outside = await repo.insert(product("Outside"));
    await db.insert(productTags).values([{ productId: b.id, tagId: deals!.id }, { productId: outside.id, tagId: deals!.id }]);
    const collectionId = await manualCollection([a.id, b.id]);

    const second = await repo.findPage({ page: 2, pageSize: 1 }, { collectionId, sort: ProductSort.Manual });
    expect(second.items.map(item => item.title)).toEqual(["B"]);

    const filtered = await repo.findPage({ page: 1, pageSize: 10, tag: ["deals"] }, { collectionId });
    expect(filtered.items.map(item => item.title)).toEqual(["B"]);
    expect(filtered.total).toBe(1);
  });

  it("is empty for a collection with no products", async () => {
    await repo.insert(product("A"));
    const collectionId = await manualCollection([]);

    expect(await repo.findPage({ page: 1, pageSize: 10 }, { collectionId })).toEqual({ items: [], total: 0 });
  });
});

describe("countMatching", () => {
  it("counts every product without rules and only the matches with them", async () => {
    await repo.insert(product("A", { retailer: "Etsy" }));
    await repo.insert(product("B", { retailer: "Amazon" }));

    expect(await repo.countMatching({})).toBe(2);
    expect(await repo.countMatching({ rules: null })).toBe(2);
    expect(await repo.countMatching({ rules: etsyOnly })).toBe(1);
  });
});

describe("findPage with rules and sorting", () => {
  it("applies the rules and the sort together", async () => {
    await repo.insert(product("Dear", { retailer: "Etsy", pricePence: 900 }));
    await repo.insert(product("Cheap", { retailer: "Etsy", pricePence: 100 }));
    await repo.insert(product("Other", { retailer: "Amazon", pricePence: 1 }));

    const { items, total } = await repo.findPage({ page: 1, pageSize: 10 }, { rules: etsyOnly, sort: ProductSort.PriceAsc });
    expect(items.map(item => item.title)).toEqual(["Cheap", "Dear"]);
    expect(total).toBe(2);
  });
});

describe("findTagFacets", () => {
  const seedFacets = async () => {
    const [deals, gifts, hidden, unused] = await db.insert(tags).values([
      { name: "Deals", slug: "deals", showInFilter: true, priority: 1 },
      { name: "Gifts", slug: "gifts", showInFilter: true, priority: 5 },
      { name: "Hidden", slug: "hidden", showInFilter: false },
      { name: "Unused", slug: "unused", showInFilter: true },
    ]).returning();
    const a = await repo.insert(product("A", { retailer: "Etsy" }));
    const b = await repo.insert(product("B", { retailer: "Etsy" }));
    const c = await repo.insert(product("C", { retailer: "Amazon" }));
    await db.insert(productTags).values([
      { productId: a.id, tagId: deals!.id },
      { productId: b.id, tagId: deals!.id },
      { productId: c.id, tagId: deals!.id },
      { productId: a.id, tagId: gifts!.id },
      { productId: a.id, tagId: hidden!.id },
    ]);
    return { a, b, c, unused: unused! };
  };

  it("counts the filterable tags on the collection's products, highest priority first", async () => {
    await seedFacets();

    const facets = await repo.findTagFacets({});
    expect(facets).toEqual([
      { id: expect.any(String), name: "Gifts", slug: "gifts", icon: null, tooltip: null, count: 1 },
      { id: expect.any(String), name: "Deals", slug: "deals", icon: null, tooltip: null, count: 3 },
    ]);
  });

  it("only counts products matching the rules", async () => {
    await seedFacets();

    const facets = await repo.findTagFacets({ rules: etsyOnly });
    expect(facets.map(facet => [facet.slug, facet.count])).toEqual([["gifts", 1], ["deals", 2]]);
  });

  it("only counts a manual collection's products", async () => {
    const { b } = await seedFacets();
    const [collection] = await db.insert(collections).values({ title: "Picks", handle: "picks", type: StoredCollectionType.Manual }).returning();
    await db.insert(collectionProducts).values({ collectionId: collection!.id, productId: b.id, position: 0 });

    const facets = await repo.findTagFacets({ collectionId: collection!.id });
    expect(facets.map(facet => [facet.slug, facet.count])).toEqual([["deals", 1]]);
  });

  it("is empty when no tag is filterable or the collection is empty", async () => {
    expect(await repo.findTagFacets({})).toEqual([]);

    await seedFacets();
    const [empty] = await db.insert(collections).values({ title: "Empty", handle: "empty", type: StoredCollectionType.Manual }).returning();
    expect(await repo.findTagFacets({ collectionId: empty!.id })).toEqual([]);
  });
});

describe("findRetailers", () => {
  it("lists each retailer once, sorted, skipping missing and blank ones", async () => {
    await repo.insert(product("A", { retailer: "Etsy" }));
    await repo.insert(product("B", { retailer: "Amazon" }));
    await repo.insert(product("C", { retailer: "Etsy" }));
    await repo.insert(product("D", { retailer: null }));
    await repo.insert(product("E", { retailer: "" }));

    expect(await repo.findRetailers()).toEqual(["Amazon", "Etsy"]);
  });

  it("is empty without products", async () => {
    expect(await repo.findRetailers()).toEqual([]);
  });
});

describe("findExistingIds", () => {
  it("returns only the ids that are products", async () => {
    const a = await repo.insert(product("A"));

    expect(await repo.findExistingIds([a.id, unknownId])).toEqual([a.id]);
    expect(await repo.findExistingIds([])).toEqual([]);
  });
});

describe("findFeaturedImages", () => {
  it("picks the image at the lowest position", async () => {
    const withImages = await repo.insert(product("With images"));
    const without = await repo.insert(product("Without"));
    await repo.replaceImages(withImages.id, [
      { productId: withImages.id, url: "/second.jpg", alt: "Second", position: 1 },
      { productId: withImages.id, url: "/first.jpg", alt: "First", position: 0 },
    ]);

    const featured = await repo.findFeaturedImages([withImages.id, without.id]);
    expect(featured.get(withImages.id)).toEqual({ url: "/first.jpg", alt: "First" });
    expect(featured.has(without.id)).toBe(false);
  });

  it("returns an empty map for no ids", async () => {
    expect((await repo.findFeaturedImages([])).size).toBe(0);
  });
});

describe("replaceImages", () => {
  it("swaps the existing images for the new ones", async () => {
    const { id } = await repo.insert(product("Lamp"));
    await repo.replaceImages(id, [{ productId: id, url: "/old.jpg", position: 0 }]);
    await repo.replaceImages(id, [
      { productId: id, url: "/a.jpg", position: 0 },
      { productId: id, url: "/b.jpg", position: 1 },
    ]);

    const found = await repo.findWithImages(id);
    expect(found?.images.map(image => image.url)).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("clears the images when given none", async () => {
    const { id } = await repo.insert(product("Lamp"));
    await repo.replaceImages(id, [{ productId: id, url: "/old.jpg", position: 0 }]);
    await repo.replaceImages(id, []);

    expect((await repo.findWithImages(id))?.images).toEqual([]);
  });
});

describe("lookups by id", () => {
  it("return undefined for an unknown id", async () => {
    expect(await repo.findById(unknownId)).toBeUndefined();
    expect(await repo.findWithImages(unknownId)).toBeUndefined();
    expect(await repo.update(unknownId, { title: "x" })).toBeUndefined();
  });
});

describe("countSamples and deleteSamples", () => {
  it("only removes samples, and their images with them", async () => {
    const sample = await repo.insert(product("Sample", { isSample: true }));
    const real = await repo.insert(product("Real"));
    await repo.replaceImages(sample.id, [{ productId: sample.id, url: "/s.jpg", position: 0 }]);
    await repo.replaceImages(real.id, [{ productId: real.id, url: "/r.jpg", position: 0 }]);

    expect(await repo.countSamples()).toBe(1);
    expect(await repo.deleteSamples()).toBe(1);
    expect(await repo.countSamples()).toBe(0);

    expect(await repo.findById(sample.id)).toBeUndefined();
    expect(await repo.findById(real.id)).toBeDefined();
    const featured = await repo.findFeaturedImages([sample.id, real.id]);
    expect([...featured.keys()]).toEqual([real.id]);
  });
});
