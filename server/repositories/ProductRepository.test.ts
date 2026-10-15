import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { tags, productTags } from "hub:db:schema";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import { ProductRepository, type NewProduct } from "./ProductRepository";

let db: TestDb;
let close: () => Promise<void>;
let repo: ProductRepository;
let authorId: string;

const unknownId = "00000000-0000-4000-8000-000000000000";

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
    const [deals, gifts, other] = await db
      .insert(tags)
      .values([
        { name: "Deals", slug: "deals" },
        { name: "Gifts", slug: "gifts" },
        { name: "Other", slug: "other" },
      ])
      .returning();
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
