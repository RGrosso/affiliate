import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTagSchema } from "#shared/schemas/tags.schema";
import { createTestDb, resetDb, type TestDb } from "../../test/setup/db";
import { TagService } from "./TagService";

let db: TestDb;
let close: () => Promise<void>;
let service: TagService;

const unknownId = "00000000-0000-4000-8000-000000000000";

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as H3Error<ApiError>;
  }
  throw new Error("Expected the promise to reject");
};

const edit = (name: string) => ({ name, description: null, tooltip: null, icon: null, priority: null, showOnCards: false });

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  service = new TagService(db);
});

afterAll(() => close());

beforeEach(() => resetDb(db));

describe("create", () => {
  it("trims the name and builds the slug from it", async () => {
    const created = await service.create(createTagSchema.parse({ name: "  Air Fryers " }));

    expect(created).toMatchObject({ name: "Air Fryers", slug: "air-fryers", showOnCards: false, priority: null });
  });

  it("rejects a name that makes an existing slug as a conflict on the name field", async () => {
    await service.create({ name: "Air Fryers" });

    const error = await rejection(service.create({ name: "air fryers" }));
    expect(error.statusCode).toBe(409);
    expect(error.data?.fieldErrors?.name).toEqual(["A tag with this name already exists"]);
  });
});

describe("list", () => {
  it("returns the tags with their product counts", async () => {
    await service.create({ name: "Deals" });

    expect(await service.list()).toMatchObject([{ name: "Deals", productCount: 0 }]);
  });
});

describe("update", () => {
  it("saves the details and re-slugs on rename", async () => {
    const { id } = await service.create({ name: "Deals" });

    const updated = await service.update(id, { ...edit("Hot Deals"), tooltip: "Reduced", icon: "flame", priority: 4, showOnCards: true });
    expect(updated).toMatchObject({ id, name: "Hot Deals", slug: "hot-deals", tooltip: "Reduced", icon: "flame", priority: 4, showOnCards: true });
  });

  it("rejects a rename that clashes with another tag", async () => {
    await service.create({ name: "Gifts" });
    const { id } = await service.create({ name: "Deals" });

    const error = await rejection(service.update(id, edit("gifts")));
    expect(error.statusCode).toBe(409);
    expect(error.data?.fieldErrors?.name).toEqual(["A tag with this name already exists"]);
  });

  it("allows saving a tag under its own name", async () => {
    const { id } = await service.create({ name: "Deals" });

    expect(await service.update(id, { ...edit("DEALS"), priority: 2 })).toMatchObject({ slug: "deals", priority: 2 });
  });

  it("throws a 404 for an unknown tag", async () => {
    const error = await rejection(service.update(unknownId, edit("x")));
    expect(error.statusCode).toBe(404);
    expect(error.data).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("delete", () => {
  it("removes the tag", async () => {
    const { id } = await service.create({ name: "Deals" });

    await service.delete(id);
    expect(await service.list()).toEqual([]);
  });

  it("throws a 404 for an unknown tag", async () => {
    const error = await rejection(service.delete(unknownId));
    expect(error.statusCode).toBe(404);
  });
});
