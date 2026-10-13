import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { products } from "../db/schema";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
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
      { title: "Moon Lamp", price: 19.99, images: [{ url: "/a.jpg", alt: "A" }, { url: "/b.jpg" }] },
      authorId
    );

    expect(created).toMatchObject({ title: "Moon Lamp", handle: "moon-lamp", pricePence: 1999, authorId });

    const found = await service.get(created.id);
    expect(found.images).toEqual([{ url: "/a.jpg", alt: "A" }, { url: "/b.jpg", alt: null }]);
  });

  it("rejects a duplicate handle as a conflict on the handle field", async () => {
    await service.create({ title: "Lamp", images: [] }, authorId);

    const error = await rejection(service.create({ title: "Other", handle: "lamp", images: [] }, authorId));
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
      { title: "A", images: [{ url: "/a.jpg", alt: "A" }, { url: "/a2.jpg" }] },
      authorId
    );
    const sample = await service.create({ title: "B", images: [] }, authorId);
    await service.create({ title: "C", images: [] }, authorId);
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
    const { id } = await service.create({ title: "Lamp", price: 10, images: [{ url: "/old.jpg" }] }, authorId);

    const updated = await service.update(id, { title: "Lamp 2", price: 12.5, images: [{ url: "/new.jpg" }] });
    expect(updated).toMatchObject({ title: "Lamp 2", pricePence: 1250, images: [{ url: "/new.jpg", alt: null }] });
  });

  it("rolls back the images when the handle is already used", async () => {
    await service.create({ title: "Taken", images: [] }, authorId);
    const { id } = await service.create({ title: "Mine", images: [{ url: "/keep.jpg" }] }, authorId);

    const error = await rejection(
      service.update(id, { title: "Mine", handle: "taken", images: [{ url: "/lost.jpg" }] })
    );
    expect(error.statusCode).toBe(409);
    expect(error.data?.fieldErrors?.handle).toBeDefined();

    const found = await service.get(id);
    expect(found.handle).toBe("mine");
    expect(found.images).toEqual([{ url: "/keep.jpg", alt: null }]);
  });

  it("throws a 404 for an unknown product", async () => {
    const error = await rejection(service.update(unknownId, { title: "x", images: [] }));
    expect(error.statusCode).toBe(404);
  });
});

describe("deleteSamples", () => {
  it("returns how many samples were removed", async () => {
    const sample = await service.create({ title: "Sample", images: [] }, authorId);
    await service.create({ title: "Real", images: [] }, authorId);
    await db.update(products).set({ isSample: true }).where(eq(products.id, sample.id));

    expect(await service.deleteSamples()).toBe(1);
    expect((await service.list({ page: 1, pageSize: 10 })).total).toBe(1);
  });
});
