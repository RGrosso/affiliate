import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { productTags, products } from "../db/schema";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import { ProductRepository } from "./ProductRepository";
import { TagRepository, type NewTag } from "./TagRepository";

let db: TestDb;
let close: () => Promise<void>;
let repo: TagRepository;
let productRepo: ProductRepository;
let authorId: string;

const unknownId = "00000000-0000-4000-8000-000000000000";

const tag = (name: string, extra: Partial<NewTag> = {}): NewTag => ({
  name,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  ...extra,
});

const addProduct = (title: string) => productRepo.insert({ title, handle: title.toLowerCase(), authorId });

const links = () => db.select().from(productTags);

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  repo = new TagRepository(db);
  productRepo = new ProductRepository(db);
});

afterAll(() => close());

beforeEach(async () => {
  await resetDb(db);
  authorId = (await insertTestUser(db)).id;
});

describe("findAll", () => {
  it("counts the products using each tag, ordered by name", async () => {
    const [zebra, apple] = [await repo.insert(tag("Zebra")), await repo.insert(tag("Apple"))];
    await repo.insert(tag("Unused"));
    const [one, two] = [await addProduct("One"), await addProduct("Two")];
    await repo.replaceForProduct(one.id, [zebra.id, apple.id]);
    await repo.replaceForProduct(two.id, [zebra.id]);

    expect(await repo.findAll()).toMatchObject([
      { name: "Apple", productCount: 1 },
      { name: "Unused", productCount: 0 },
      { name: "Zebra", productCount: 2 },
    ]);
  });

  it("is empty with no tags", async () => {
    expect(await repo.findAll()).toEqual([]);
  });
});

describe("findById and findByIds", () => {
  it("returns plain tag rows without timestamps", async () => {
    const created = await repo.insert(tag("Deals", { priority: 3, icon: "flame", showOnCards: true }));

    const found = await repo.findById(created.id);
    expect(found).toEqual({
      id: created.id,
      name: "Deals",
      slug: "deals",
      description: null,
      tooltip: null,
      icon: "flame",
      priority: 3,
      showOnCards: true,
    });
    expect(await repo.findById(unknownId)).toBeUndefined();
  });

  it("finds only the tags that exist", async () => {
    const [a, b] = [await repo.insert(tag("A")), await repo.insert(tag("B"))];

    expect((await repo.findByIds([a.id, unknownId])).map(found => found.id)).toEqual([a.id]);
    expect(await repo.findByIds([a.id, b.id])).toHaveLength(2);
    expect(await repo.findByIds([])).toEqual([]);
  });
});

describe("findForProducts", () => {
  it("returns an empty map for no products", async () => {
    expect((await repo.findForProducts([])).size).toBe(0);
  });

  it("sorts each product's tags by priority, then name", async () => {
    const [low, high, beta, alpha] = [
      await repo.insert(tag("Low", { priority: 1 })),
      await repo.insert(tag("High", { priority: 10 })),
      await repo.insert(tag("Beta")),
      await repo.insert(tag("Alpha")),
    ];
    const [one, two] = [await addProduct("One"), await addProduct("Two")];
    await repo.replaceForProduct(one.id, [beta.id, low.id, alpha.id, high.id]);
    await repo.replaceForProduct(two.id, [low.id]);

    const byProduct = await repo.findForProducts([one.id, two.id]);
    expect(byProduct.get(one.id)?.map(found => found.name)).toEqual(["High", "Low", "Alpha", "Beta"]);
    expect(byProduct.get(two.id)?.map(found => found.name)).toEqual(["Low"]);
  });

  it("leaves out products without tags", async () => {
    const product = await addProduct("Plain");
    expect((await repo.findForProducts([product.id])).has(product.id)).toBe(false);
  });
});

describe("update and delete", () => {
  it("updates a tag and returns it", async () => {
    const created = await repo.insert(tag("Deals"));

    expect(await repo.update(created.id, { name: "Offers", slug: "offers" })).toMatchObject({ id: created.id, name: "Offers", slug: "offers" });
    expect(await repo.update(unknownId, { name: "x" })).toBeUndefined();
  });

  it("reports whether a tag was deleted", async () => {
    const created = await repo.insert(tag("Deals"));

    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.delete(created.id)).toBe(false);
  });
});

describe("replaceForProduct", () => {
  it("replaces the product's tags and ignores duplicate ids", async () => {
    const [a, b] = [await repo.insert(tag("A")), await repo.insert(tag("B"))];
    const [one, two] = [await addProduct("One"), await addProduct("Two")];
    await repo.replaceForProduct(two.id, [a.id]);

    await repo.replaceForProduct(one.id, [a.id, a.id]);
    expect(await links()).toHaveLength(2);

    await repo.replaceForProduct(one.id, [b.id, b.id]);
    expect((await repo.findForProducts([one.id])).get(one.id)?.map(found => found.id)).toEqual([b.id]);
    expect((await repo.findForProducts([two.id])).get(two.id)).toHaveLength(1);

    await repo.replaceForProduct(one.id, []);
    expect(await links()).toHaveLength(1);
  });

  it("removes a tag's product links when the tag is deleted", async () => {
    const [a, b] = [await repo.insert(tag("A")), await repo.insert(tag("B"))];
    const product = await addProduct("One");
    await repo.replaceForProduct(product.id, [a.id, b.id]);

    await repo.delete(a.id);

    expect(await links()).toEqual([{ productId: product.id, tagId: b.id }]);
    expect(await db.select().from(products).where(eq(products.id, product.id))).toHaveLength(1);
  });

  it("removes a product's tag links when the product is deleted", async () => {
    const a = await repo.insert(tag("A"));
    const product = await addProduct("One");
    await repo.replaceForProduct(product.id, [a.id]);

    await db.delete(products).where(eq(products.id, product.id));

    expect(await links()).toEqual([]);
    expect(await repo.findById(a.id)).toBeDefined();
  });
});
