import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { productImages, products, settings } from "../db/schema";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import { sampleProducts } from "../utils/sampleProducts";
import { ProductService } from "./ProductService";

let db: TestDb;
let close: () => Promise<void>;
let service: ProductService;
let authorId: string;

const unknownId = "00000000-0000-4000-8000-000000000000";

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as H3Error<ApiError>;
  }
  throw new Error("Expected the promise to reject");
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  service = new ProductService(db);
});

afterAll(() => close());

beforeEach(async () => {
  await resetDb(db);
  authorId = (await insertTestUser(db)).id;
});

describe("create", () => {
  it("stores the price in pence and the images in order", async () => {
    const created = await service.create(
      { title: "Moon Lamp", price: 19.99, tagIds: [], images: [{ url: "/a.jpg", alt: "A" }, { url: "/b.jpg" }] },
      authorId
    );

    expect(created).toMatchObject({ title: "Moon Lamp", handle: "moon-lamp", pricePence: 1999, authorId });

    const found = await service.get(created.id);
    expect(found.images).toEqual([{ url: "/a.jpg", alt: "A" }, { url: "/b.jpg", alt: null }]);
  });

  it("rejects a duplicate handle as a conflict on the handle field", async () => {
    await service.create({ title: "Lamp", tagIds: [], images: [] }, authorId);

    const error = await rejection(service.create({ title: "Other", handle: "lamp", tagIds: [], images: [] }, authorId));
    expect(error.statusCode).toBe(409);
    expect(error.data?.fieldErrors?.handle).toEqual(["Another product already uses this URL handle"]);
  });
});

describe("get", () => {
  it("throws a 404 for an unknown product", async () => {
    const error = await rejection(service.get(unknownId));
    expect(error.statusCode).toBe(404);
    expect(error.data).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("getByHandle", () => {
  const addTag = (name: string, priority: number | null = null, showOnCards = false) =>
    new TagRepository(db).insert({ name, slug: slugify(name), priority, showOnCards, tooltip: `${name} tip` });

  it("returns the public product with its images, brand and every tag as a badge", async () => {
    const [low, top, hidden] = [await addTag("Low", 1, true), await addTag("Top", 9, true), await addTag("Hidden", 5)];
    await service.create({
      title: "Moon Lamp",
      brand: "Luna",
      retailer: "Lamp Shop",
      price: 19.99,
      tagIds: [low.id, top.id, hidden.id],
      images: [{ url: "/a.jpg", alt: "Front" }, { url: "/b.jpg" }],
    }, authorId);

    const product = await service.getByHandle("moon-lamp");

    expect(product).toMatchObject({ title: "Moon Lamp", brand: "Luna", retailer: "Lamp Shop", pricePence: 1999, isSample: false });
    expect(product.images).toEqual([{ url: "/a.jpg", alt: "Front" }, { url: "/b.jpg", alt: null }]);
    expect(product.tags.map(tag => tag.name)).toEqual(["Top", "Hidden", "Low"]);
    expect(Object.keys(product.tags[0]!).sort()).toEqual(["icon", "id", "name", "slug", "tooltip"]);
    expect(product).not.toHaveProperty("authorId");
  });

  it("sanitises the description", async () => {
    await service.create({
      title: "Lamp",
      description: "<p onclick=\"x()\">Bright</p><script>alert(1)</script>",
      tagIds: [],
      images: [],
    }, authorId);

    expect((await service.getByHandle("lamp")).description).toBe("<p>Bright</p>");
  });

  it("throws a 404 for an unknown handle", async () => {
    const error = await rejection(service.getByHandle("no-such-product"));
    expect(error.statusCode).toBe(404);
    expect(error.data).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("list", () => {
  it("is empty with no pages when there are no products", async () => {
    expect(await service.list({ page: 1, pageSize: 2 })).toEqual({
      items: [],
      page: 1,
      pageSize: 2,
      total: 0,
      totalPages: 0,
    });
  });

  it("pages the products with their featured image", async () => {
    const withImage = await service.create(
      { title: "A", tagIds: [], images: [{ url: "/a.jpg", alt: "A" }, { url: "/a2.jpg" }] },
      authorId
    );
    const sample = await service.create({ title: "B", tagIds: [], images: [] }, authorId);
    await service.create({ title: "C", tagIds: [], images: [] }, authorId);
    await db.update(products).set({ isSample: true }).where(eq(products.id, sample.id));

    const paged = await service.list({ page: 1, pageSize: 2 });
    expect(paged).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(paged.items).toHaveLength(2);

    const { items } = await service.list({ page: 1, pageSize: 10 });
    expect(items.find(item => item.id === withImage.id)?.image).toEqual({ url: "/a.jpg", alt: "A" });
    expect(items.filter(item => item.image === null)).toHaveLength(2);
  });
});

describe("update", () => {
  it("replaces the fields and images", async () => {
    const { id } = await service.create({ title: "Lamp", price: 10, tagIds: [], images: [{ url: "/old.jpg" }] }, authorId);

    const updated = await service.update(id, { title: "Lamp 2", price: 12.5, tagIds: [], images: [{ url: "/new.jpg" }] });
    expect(updated).toMatchObject({ title: "Lamp 2", pricePence: 1250, images: [{ url: "/new.jpg", alt: null }] });
  });

  it("rolls back the images when the handle is already used", async () => {
    await service.create({ title: "Taken", tagIds: [], images: [] }, authorId);
    const { id } = await service.create({ title: "Mine", tagIds: [], images: [{ url: "/keep.jpg" }] }, authorId);

    const error = await rejection(
      service.update(id, { title: "Mine", handle: "taken", tagIds: [], images: [{ url: "/lost.jpg" }] })
    );
    expect(error.statusCode).toBe(409);
    expect(error.data?.fieldErrors?.handle).toBeDefined();

    const found = await service.get(id);
    expect(found.handle).toBe("mine");
    expect(found.images).toEqual([{ url: "/keep.jpg", alt: null }]);
  });

  it("throws a 404 for an unknown product", async () => {
    const error = await rejection(service.update(unknownId, { title: "x", tagIds: [], images: [] }));
    expect(error.statusCode).toBe(404);
  });
});

describe("tags", () => {
  const addTag = (name: string, priority: number | null = null, showOnCards = false) =>
    new TagRepository(db).insert({ name, slug: name.toLowerCase().replaceAll(" ", "-"), priority, showOnCards });

  it("stores the tags on create and returns them from get", async () => {
    const [deals, gifts] = [await addTag("Deals", 5), await addTag("Gifts")];

    const { id } = await service.create({ title: "Lamp", tagIds: [gifts.id, deals.id], images: [] }, authorId);

    const found = await service.get(id);
    expect(found.tags.map(tag => tag.name)).toEqual(["Deals", "Gifts"]);
    expect([...found.tagIds].sort()).toEqual([deals.id, gifts.id].sort());
  });

  it("replaces the tags on update", async () => {
    const [deals, gifts] = [await addTag("Deals"), await addTag("Gifts")];
    const { id } = await service.create({ title: "Lamp", tagIds: [deals.id], images: [] }, authorId);

    const updated = await service.update(id, { title: "Lamp", tagIds: [gifts.id], images: [] });
    expect(updated.tagIds).toEqual([gifts.id]);

    expect((await service.update(id, { title: "Lamp", tagIds: [], images: [] })).tags).toEqual([]);
  });

  it("rejects an unknown tag with a field error and changes nothing", async () => {
    const deals = await addTag("Deals");
    const { id } = await service.create({ title: "Lamp", tagIds: [deals.id], images: [{ url: "/keep.jpg" }] }, authorId);

    const error = await rejection(service.update(id, { title: "Changed", tagIds: [unknownId], images: [] }));
    expect(error.statusCode).toBe(400);
    expect(error.data?.fieldErrors?.tagIds).toEqual(["One of these tags no longer exists. Please refresh and try again"]);

    const found = await service.get(id);
    expect(found.title).toBe("Lamp");
    expect(found.tagIds).toEqual([deals.id]);
    expect(found.images).toHaveLength(1);
  });

  it("rejects an unknown tag on create without adding the product", async () => {
    const error = await rejection(service.create({ title: "Lamp", tagIds: [unknownId], images: [] }, authorId));
    expect(error.statusCode).toBe(400);
    expect((await service.list({ page: 1, pageSize: 10 })).total).toBe(0);
  });

  it("lists only the tagged products, with the right total", async () => {
    const [deals, gifts] = [await addTag("Deals"), await addTag("Gifts")];
    const tagged = await service.create({ title: "Tagged", tagIds: [deals.id, gifts.id], images: [] }, authorId);
    await service.create({ title: "Also tagged", tagIds: [deals.id], images: [] }, authorId);
    await service.create({ title: "Plain", tagIds: [], images: [] }, authorId);

    const dealsPage = await service.list({ page: 1, pageSize: 1, tag: ["deals"] });
    expect(dealsPage).toMatchObject({ total: 2, totalPages: 2 });
    expect(dealsPage.items).toHaveLength(1);

    const giftsPage = await service.list({ page: 1, pageSize: 10, tag: ["gifts"] });
    expect(giftsPage.items.map(item => item.id)).toEqual([tagged.id]);
    expect(giftsPage.total).toBe(1);

    expect((await service.list({ page: 1, pageSize: 10, tag: ["no-such-tag"] })).total).toBe(0);
    expect((await service.list({ page: 1, pageSize: 10 })).total).toBe(3);
  });

  it("matches products with any of several tags without duplicates", async () => {
    const [deals, gifts] = [await addTag("Deals"), await addTag("Gifts")];
    await service.create({ title: "Both", tagIds: [deals.id, gifts.id], images: [] }, authorId);
    await service.create({ title: "Gift", tagIds: [gifts.id], images: [] }, authorId);
    await service.create({ title: "Plain", tagIds: [], images: [] }, authorId);

    const page = await service.list({ page: 1, pageSize: 10, tag: ["deals", "gifts"] });
    expect(page.items.map(item => item.title).sort()).toEqual(["Both", "Gift"]);
    expect(page.total).toBe(2);
  });

  describe("list tags", () => {
    const query = { page: 1, pageSize: 10 };

    const createTagged = async () => {
      const tags = [
        await addTag("Low", 1, true),
        await addTag("Top", 9, true),
        await addTag("Mid", 5, true),
        await addTag("Fourth", 2, true),
        await addTag("Hidden", 100),
      ];
      await service.create({ title: "Lamp", tagIds: tags.map(tag => tag.id), images: [] }, authorId);
      await service.create({ title: "Plain", tagIds: [], images: [] }, authorId);
    };

    it("gives the public list only the top three on-card tags as badges", async () => {
      await createTagged();

      const { items } = await service.list(query);
      const lamp = items.find(item => item.title === "Lamp")!;
      expect(lamp.tags.map(tag => tag.name)).toEqual(["Top", "Mid", "Fourth"]);
      expect(Object.keys(lamp.tags[0]!).sort()).toEqual(["icon", "id", "name", "slug", "tooltip"]);
      expect(items.find(item => item.title === "Plain")?.tags).toEqual([]);
    });

    it("gives the admin list every tag as a badge, highest priority first", async () => {
      await createTagged();

      const { items } = await service.list(query, { forAdmin: true });
      const lamp = items.find(item => item.title === "Lamp")!;
      expect(lamp.tags.map(tag => tag.name)).toEqual(["Hidden", "Top", "Mid", "Fourth", "Low"]);
      expect(lamp.tags[0]).not.toHaveProperty("showOnCards");
      expect(lamp.tags[0]).not.toHaveProperty("priority");
      expect(lamp.tags[0]).not.toHaveProperty("description");
    });
  });
});

describe("seedSamplesOnce", () => {
  const imageTotal = sampleProducts.reduce((sum, sample) => sum + sample.imageCount, 0);
  const allProducts = () => db.select().from(products);

  it("seeds every sample product with its images", async () => {
    await service.seedSamplesOnce(authorId);

    const seeded = await allProducts();
    expect(seeded.map(product => product.handle).sort()).toEqual(sampleProducts.map(sample => sample.handle).sort());
    expect(seeded.every(product => product.isSample && product.authorId === authorId)).toBe(true);
    expect(await db.select().from(productImages)).toHaveLength(imageTotal);
  });

  it("does not duplicate the samples when run twice", async () => {
    await service.seedSamplesOnce(authorId);
    await service.seedSamplesOnce(authorId);

    expect(await allProducts()).toHaveLength(sampleProducts.length);
    expect(await db.select().from(productImages)).toHaveLength(imageTotal);
  });

  it("does not bring the samples back after they are deleted", async () => {
    await service.seedSamplesOnce(authorId);
    await db.delete(products);
    await service.seedSamplesOnce(authorId);

    expect(await allProducts()).toHaveLength(0);
  });

  it("skips a store that already has products and marks it as done", async () => {
    const real = await service.create({ title: "Real", tagIds: [], images: [] }, authorId);

    await service.seedSamplesOnce(authorId);
    expect(await allProducts()).toHaveLength(1);
    expect(await db.select().from(settings)).toHaveLength(1);

    await db.delete(products).where(eq(products.id, real.id));
    await service.seedSamplesOnce(authorId);
    expect(await allProducts()).toHaveLength(0);
  });
});
