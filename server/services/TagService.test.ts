import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTagSchema } from "#shared/schemas/tags.schema";
import { createTestDb, resetDb, type TestDb } from "../../test/setup/db";
import { CollectionRepository } from "../repositories/CollectionRepository";
import { StoredCollectionType } from "../utils/storedCollection";
import { STORED_RULES_VERSION, StoredRuleMatch, StoredRuleType, StoredTagOperator } from "../utils/storedCollectionRules";
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

const addAutomatedCollection = (title: string, tagId: string) =>
  new CollectionRepository(db).insert({
    title,
    handle: slugify(title),
    type: StoredCollectionType.Automated,
    rules: {
      version: STORED_RULES_VERSION,
      match: StoredRuleMatch.All,
      rules: [{ type: StoredRuleType.Tag, operator: StoredTagOperator.Has, tagId }],
    },
  });

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

    expect(created).toMatchObject({ name: "Air Fryers", slug: "air-fryers", showOnCards: false, showInFilter: false, priority: null });
  });

  it("saves any details sent with the name", async () => {
    const created = await service.create(
      createTagSchema.parse({
        name: "Hot Deals",
        description: "Reduced this week",
        tooltip: "Reduced",
        icon: "flame",
        priority: 5,
        showOnCards: true,
        showInFilter: true,
      })
    );

    expect(created).toMatchObject({
      name: "Hot Deals",
      slug: "hot-deals",
      description: "Reduced this week",
      tooltip: "Reduced",
      icon: "flame",
      priority: 5,
      showOnCards: true,
      showInFilter: true,
    });
    expect(await service.list()).toMatchObject([{ id: created.id, icon: "flame", showOnCards: true }]);
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

    expect(await service.list()).toMatchObject([{ name: "Deals", productCount: 0, collections: [] }]);
  });
});

describe("get", () => {
  it("returns the tag", async () => {
    const { id } = await service.create({ name: "Deals", tooltip: "Cheap" });

    expect(await service.get(id)).toMatchObject({ id, name: "Deals", slug: "deals", tooltip: "Cheap" });
  });

  it("throws a 404 for an unknown tag", async () => {
    const error = await rejection(service.get(unknownId));

    expect(error.statusCode).toBe(404);
    expect(error.data).toMatchObject({ code: "NOT_FOUND", message: "We couldn't find that tag" });
  });
});

describe("update", () => {
  it("saves the details and re-slugs on rename", async () => {
    const { id } = await service.create({ name: "Deals" });

    const updated = await service.update(id, { ...edit("Hot Deals"), tooltip: "Reduced", icon: "flame", priority: 4, showOnCards: true, showInFilter: true });
    expect(updated).toMatchObject({
      id,
      name: "Hot Deals",
      slug: "hot-deals",
      tooltip: "Reduced",
      icon: "flame",
      priority: 4,
      showOnCards: true,
      showInFilter: true,
    });
  });

  it("changes only the fields that are sent", async () => {
    const { id } = await service.create({ name: "Deals" });
    await service.update(id, { icon: "flame", priority: 4, showOnCards: true, showInFilter: true });

    const updated = await service.update(id, { tooltip: "Reduced" });
    expect(updated).toMatchObject({ name: "Deals", slug: "deals", tooltip: "Reduced", icon: "flame", priority: 4, showOnCards: true, showInFilter: true });
  });

  it("returns the tag unchanged for an empty update", async () => {
    const { id } = await service.create({ name: "Deals" });

    expect(await service.update(id, {})).toMatchObject({ id, name: "Deals", slug: "deals" });
  });

  it("throws a 404 for an empty update of an unknown tag", async () => {
    const error = await rejection(service.update(unknownId, {}));
    expect(error.statusCode).toBe(404);
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

  it("refuses while one collection uses the tag, naming it", async () => {
    const { id } = await service.create({ name: "Deals" });
    await addAutomatedCollection("Summer sale", id);

    const error = await rejection(service.delete(id));
    expect(error.statusCode).toBe(409);
    expect(error.data?.message).toBe("This tag is used by Summer sale. Remove it from that collection first.");
    expect(await service.list()).toHaveLength(1);
  });

  it("names every collection that uses the tag", async () => {
    const { id } = await service.create({ name: "Deals" });
    await addAutomatedCollection("Summer sale", id);
    await addAutomatedCollection("Black Friday", id);
    await addAutomatedCollection("Gifts", id);

    const error = await rejection(service.delete(id));
    expect(error.data?.message).toBe("This tag is used by Black Friday, Gifts and Summer sale. Remove it from those collections first.");
  });

  it("deletes the tag once no collection uses it", async () => {
    const { id } = await service.create({ name: "Deals" });
    const collection = await addAutomatedCollection("Summer sale", id);
    await new CollectionRepository(db).delete(collection.id);

    await service.delete(id);
    expect(await service.list()).toEqual([]);
  });
});

describe("list with collections", () => {
  it("shows the collections that use each tag", async () => {
    const used = await service.create({ name: "Deals" });
    await service.create({ name: "Unused" });
    const collection = await addAutomatedCollection("Summer sale", used.id);

    const listed = await service.list();
    expect(listed.find(tag => tag.name === "Deals")?.collections).toEqual([{ id: collection.id, title: "Summer sale" }]);
    expect(listed.find(tag => tag.name === "Unused")?.collections).toEqual([]);
  });
});
