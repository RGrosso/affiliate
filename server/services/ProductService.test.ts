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

describe("list", () => {
  it("is empty with no pages when there are no products", async () => {
    expect(await service.list({ page: 1, pageSize: 2 })).toEqual({
      items: [],
      page: 1,
      pageSize: 2,
      total: 0,
      totalPages: 0,
      sampleCount: 0,
    });
  });

  it("pages the products with their featured image and counts the samples", async () => {
    const withImage = await service.create(
      { title: "A", tagIds: [], images: [{ url: "/a.jpg", alt: "A" }, { url: "/a2.jpg" }] },
      authorId
    );
    const sample = await service.create({ title: "B", tagIds: [], images: [] }, authorId);
    await service.create({ title: "C", tagIds: [], images: [] }, authorId);
    await db.update(products).set({ isSample: true }).where(eq(products.id, sample.id));

    const paged = await service.list({ page: 1, pageSize: 2 });
    expect(paged).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2, sampleCount: 1 });
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

describe("deleteSamples", () => {
  it("returns how many samples were removed", async () => {
    const sample = await service.create({ title: "Sample", tagIds: [], images: [] }, authorId);
    await service.create({ title: "Real", tagIds: [], images: [] }, authorId);
    await db.update(products).set({ isSample: true }).where(eq(products.id, sample.id));

    expect(await service.deleteSamples()).toBe(1);
    expect((await service.list({ page: 1, pageSize: 10 })).total).toBe(1);
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
    await service.deleteSamples();
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
