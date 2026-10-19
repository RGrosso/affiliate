import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { collections, productTags, products, tags } from "hub:db:schema";
import { createCollectionSchema, updateCollectionSchema } from "#shared/schemas/collections.schema";
import type { CreateCollectionInput } from "#shared/schemas/collections.schema";
import { CollectionStatus, CollectionType, ProductSort } from "#shared/types/collection";
import { RetailerOperator, RuleMatch, RuleType, TagOperator, type CollectionRules } from "#shared/types/collectionRules";
import { META_DESCRIPTION_LENGTH } from "#shared/utils/metaDescription";
import { createTestDb, insertTestUser, resetDb, type TestDb } from "../../test/setup/db";
import { ALL_COLLECTION_ID } from "../utils/storedCollection";
import { CollectionService } from "./CollectionService";

let db: TestDb;
let close: () => Promise<void>;
let service: CollectionService;
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

const create = (input: CreateCollectionInput) => service.create(createCollectionSchema.parse(input));
const update = (id: string, input: Parameters<typeof updateCollectionSchema.parse>[0]) => service.update(id, updateCollectionSchema.parse(input));

const addProduct = async (title: string, extra: Partial<typeof products.$inferInsert> = {}) => {
  const [product] = await db
    .insert(products)
    .values({ title, handle: title.toLowerCase().replaceAll(" ", "-"), authorId, ...extra })
    .returning();
  return product!;
};

const addTag = async (name: string, extra: Partial<typeof tags.$inferInsert> = {}) => {
  const [tag] = await db
    .insert(tags)
    .values({ name, slug: name.toLowerCase(), ...extra })
    .returning();
  return tag!;
};

const tagProduct = (productId: string, tagId: string) => db.insert(productTags).values({ productId, tagId });

const hasTag = (tagId: string, operator: TagOperator = TagOperator.Has) => ({ type: RuleType.Tag, operator, tagId }) as const;
const rulesOf = (...rules: CollectionRules["rules"]): CollectionRules => ({ match: RuleMatch.All, rules });
const titlesOf = (page: { items: { title: string }[] }) => page.items.map(item => item.title);

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  service = new CollectionService(db);
});

afterAll(() => close());

beforeEach(async () => {
  await resetDb(db);
  authorId = (await insertTestUser(db)).id;
});

describe("create", () => {
  it("saves a manual collection with its products in order", async () => {
    const [a, b] = [await addProduct("A"), await addProduct("B")];

    const created = await create({
      type: "manual",
      title: "  Gifts  ",
      description: "Presents",
      imageUrl: "/images/gifts.jpg",
      imageAlt: "Gifts",
      seoTitle: "Buy gifts",
      seoDescription: "Great gifts",
      defaultSort: "manual",
      productIds: [b.id, a.id],
    });

    expect(created).toMatchObject({
      title: "Gifts",
      handle: "gifts",
      type: CollectionType.Manual,
      status: CollectionStatus.Draft,
      locked: false,
      description: "Presents",
      imageUrl: "/images/gifts.jpg",
      imageAlt: "Gifts",
      seoTitle: "Buy gifts",
      seoDescription: "Great gifts",
      defaultSort: ProductSort.Manual,
      rules: null,
      productIds: [b.id, a.id],
    });
  });

  it("saves an automated collection with its rules mapped back to the API shape", async () => {
    const tag = await addTag("Wedding");
    const rules = rulesOf(hasTag(tag.id), {
      type: RuleType.Group,
      match: RuleMatch.Any,
      rules: [{ type: RuleType.Retailer, operator: RetailerOperator.IsNot, retailer: "Etsy" }],
    });

    const created = await create({ type: "automated", title: "Weddings", status: "published", defaultSort: "price-asc", rules });

    expect(created).toMatchObject({
      type: CollectionType.Automated,
      status: CollectionStatus.Published,
      defaultSort: ProductSort.PriceAsc,
      rules,
      productIds: [],
    });
  });

  it("stores the API values as their stored equivalents", async () => {
    const created = await create({
      type: "automated",
      title: "Priced",
      status: "published",
      defaultSort: "price-desc",
      rules: rulesOf({ type: RuleType.Retailer, operator: RetailerOperator.Is, retailer: "Etsy" }),
    });

    const [row] = await db.select().from(collections).where(eq(collections.id, created.id));
    expect(row).toMatchObject({ type: "automated", status: "published", defaultSort: "price_desc" });
    expect(row?.rules).toMatchObject({ version: 1, match: "all", rules: [{ type: "retailer", operator: "is", retailer: "Etsy" }] });
  });

  it("builds the handle from the title when none is given", async () => {
    expect((await create({ type: "manual", title: "Gifts For Her" })).handle).toBe("gifts-for-her");
    expect((await create({ type: "manual", title: "Anything", handle: "custom" })).handle).toBe("custom");
  });

  it("rejects a duplicate handle as a conflict on the handle field", async () => {
    await create({ type: "manual", title: "Gifts" });

    const error = await rejection(create({ type: "manual", title: "Gifts" }));
    expect(error.statusCode).toBe(409);
    expect(error.data?.fieldErrors?.handle).toEqual(["Another collection already uses this URL handle"]);
  });

  it("rejects the reserved all handle when it comes from the title", async () => {
    const error = await rejection(create({ type: "manual", title: "All" }));

    expect(error.statusCode).toBe(400);
    expect(error.data?.fieldErrors?.handle).toEqual(["This URL is reserved for the all products page"]);
  });

  it("rejects the reserved new handle when it comes from the title", async () => {
    const error = await rejection(create({ type: "manual", title: "New" }));

    expect(error.statusCode).toBe(400);
    expect(error.data?.fieldErrors?.handle).toEqual(["This URL is reserved for the add collection page"]);
  });

  it("rejects a title that can't make a handle", async () => {
    const error = await rejection(create({ type: "manual", title: "!!!" }));

    expect(error.data?.fieldErrors?.handle).toEqual(["Please add a URL handle using letters or numbers"]);
  });

  it("rejects a tag that no longer exists in the rules", async () => {
    const error = await rejection(create({ type: "automated", title: "Ghost", rules: rulesOf(hasTag(unknownId)) }));

    expect(error.statusCode).toBe(400);
    expect(error.data?.fieldErrors?.rules).toEqual(["One of these tags no longer exists. Please refresh and try again"]);
    expect(await service.list()).toHaveLength(1);
  });

  it("rejects a product that no longer exists and saves nothing", async () => {
    const product = await addProduct("A");

    const error = await rejection(create({ type: "manual", title: "Gifts", productIds: [product.id, unknownId] }));
    expect(error.data?.fieldErrors?.productIds).toEqual(["One of these products no longer exists. Please refresh and try again"]);
    expect(await service.list()).toHaveLength(1);
  });
});

describe("getByHandleForAdmin", () => {
  it("returns the same shape as get, including a draft", async () => {
    const [product] = [await addProduct("A")];
    const { id } = await create({ type: "manual", title: "Wedding gifts", productIds: [product.id] });

    const found = await service.getByHandleForAdmin("wedding-gifts");

    expect(found).toEqual(await service.get(id));
    expect(found).toMatchObject({ id, handle: "wedding-gifts", status: CollectionStatus.Draft, productIds: [product.id] });
  });

  it("returns the locked All collection", async () => {
    expect(await service.getByHandleForAdmin("all")).toMatchObject({ id: ALL_COLLECTION_ID, locked: true });
  });

  it("throws a 404 for an unknown handle", async () => {
    const error = await rejection(service.getByHandleForAdmin("no-such-collection"));

    expect(error.statusCode).toBe(404);
    expect(error.data?.message).toBe("We couldn't find that collection");
  });
});

describe("get", () => {
  it("returns the collection for editing", async () => {
    const { id } = await create({ type: "manual", title: "Gifts" });

    expect(await service.get(id)).toMatchObject({ id, title: "Gifts", type: CollectionType.Manual, productIds: [] });
  });

  it("returns the locked All collection without rules", async () => {
    expect(await service.get(ALL_COLLECTION_ID)).toMatchObject({
      handle: "all",
      locked: true,
      type: CollectionType.Automated,
      status: CollectionStatus.Published,
      rules: null,
      productIds: [],
    });
  });

  it("throws a 404 for an unknown collection", async () => {
    const error = await rejection(service.get(unknownId));

    expect(error.statusCode).toBe(404);
    expect(error.data?.message).toBe("We couldn't find that collection");
  });
});

describe("list", () => {
  it("counts products and describes the rules", async () => {
    const wedding = await addTag("Wedding");
    const [a, b] = [await addProduct("A", { retailer: "Etsy" }), await addProduct("B", { retailer: "Etsy" })];
    await addProduct("C");
    await tagProduct(a.id, wedding.id);
    await create({ type: "manual", title: "Picks", productIds: [a.id, b.id] });
    await create({
      type: "automated",
      title: "Weddings",
      rules: rulesOf(hasTag(wedding.id), { type: RuleType.Retailer, operator: RetailerOperator.Is, retailer: "Etsy" }),
    });
    await create({
      type: "automated",
      title: "Everything but Etsy",
      rules: rulesOf({ type: RuleType.Retailer, operator: RetailerOperator.IsNot, retailer: "Etsy" }),
    });
    await create({ type: "automated", title: "Ghosts", rules: rulesOf(hasTag(wedding.id)) });
    await db.delete(tags);

    const listed = await service.list();

    expect(listed.map(item => [item.title, item.productCount, item.rulesSummary])).toEqual([
      ["All products", 3, "Every product"],
      ["Everything but Etsy", 1, "Retailer isn't Etsy"],
      ["Ghosts", 0, "Has a deleted tag"],
      ["Picks", 2, null],
      ["Weddings", 0, "Has a deleted tag and retailer is Etsy"],
    ]);
  });

  it("names the tags in the summary", async () => {
    const wedding = await addTag("Wedding");
    await create({ type: "automated", title: "Weddings", rules: rulesOf(hasTag(wedding.id)) });

    expect((await service.list()).find(item => item.handle === "weddings")).toMatchObject({
      rulesSummary: "Has the tag “Wedding”",
      status: CollectionStatus.Draft,
      type: CollectionType.Automated,
      locked: false,
    });
  });

  it("lists only the All collection on a fresh database", async () => {
    expect(await service.list()).toMatchObject([{ id: ALL_COLLECTION_ID, locked: true, productCount: 0 }]);
  });
});

describe("update", () => {
  it("changes only the fields sent", async () => {
    const { id } = await create({ type: "manual", title: "Gifts", description: "Presents", seoTitle: "SEO" });

    const updated = await update(id, { title: "Presents", status: "published", seoTitle: null });

    expect(updated).toMatchObject({ title: "Presents", handle: "gifts", status: CollectionStatus.Published, description: "Presents", seoTitle: null });
  });

  it("replaces the products in the order given and leaves them alone when not sent", async () => {
    const [a, b, c] = [await addProduct("A"), await addProduct("B"), await addProduct("C")];
    const { id } = await create({ type: "manual", title: "Gifts", productIds: [a.id, b.id] });

    expect((await update(id, { productIds: [c.id, a.id] })).productIds).toEqual([c.id, a.id]);
    expect((await update(id, { title: "Renamed" })).productIds).toEqual([c.id, a.id]);
    expect((await update(id, { productIds: [] })).productIds).toEqual([]);
  });

  it("replaces the rules of an automated collection", async () => {
    const [one, two] = [await addTag("One"), await addTag("Two")];
    const { id } = await create({ type: "automated", title: "Auto", rules: rulesOf(hasTag(one.id)) });

    expect((await update(id, { rules: rulesOf(hasTag(two.id)) })).rules).toEqual(rulesOf(hasTag(two.id)));
  });

  it("changes the handle, rejecting a taken or reserved one", async () => {
    await create({ type: "manual", title: "Taken" });
    const { id } = await create({ type: "manual", title: "Gifts" });

    expect((await update(id, { handle: "presents" })).handle).toBe("presents");
    expect((await rejection(update(id, { handle: "taken" }))).data?.fieldErrors?.handle).toEqual(["Another collection already uses this URL handle"]);
    // The schema blocks "all" too, but the service must not rely on it
    const reserved = await rejection(service.update(id, { handle: "all" }));
    expect(reserved.data?.fieldErrors?.handle).toEqual(["This URL is reserved for the all products page"]);
  });

  it("bumps the update time even when only the products change", async () => {
    const product = await addProduct("A");
    const { id } = await create({ type: "manual", title: "Gifts" });
    const before = (await service.list()).find(item => item.id === id)!.updatedAt;

    await new Promise(resolve => setTimeout(resolve, 5));
    await update(id, { productIds: [product.id] });

    expect(new Date((await service.list()).find(item => item.id === id)!.updatedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it("can't change the type", async () => {
    const { id } = await create({ type: "manual", title: "Gifts" });

    const error = await rejection(update(id, { type: "automated" }));
    expect(error.statusCode).toBe(400);
    expect(error.data?.fieldErrors?.type).toEqual(["The type of a collection can't be changed"]);
    expect((await update(id, { type: "manual" })).type).toBe(CollectionType.Manual);
  });

  it("only allows the fields that suit the type", async () => {
    const { id: manualId } = await create({ type: "manual", title: "Manual" });
    const { id: autoId } = await create({ type: "automated", title: "Auto", rules: rulesOf(hasTag((await addTag("T")).id)) });

    expect((await rejection(update(manualId, { rules: rulesOf(hasTag(unknownId)) }))).data?.fieldErrors?.rules).toEqual([
      "Collections where you pick the products don't use rules",
    ]);
    expect((await rejection(update(autoId, { productIds: [] }))).data?.fieldErrors?.productIds).toEqual([
      "Automated collections choose their products with rules",
    ]);
    expect((await rejection(update(autoId, { defaultSort: "manual" }))).data?.fieldErrors?.defaultSort).toEqual([
      "Manual order is only available for collections where you pick the products",
    ]);
    expect((await update(manualId, { defaultSort: "manual" })).defaultSort).toBe(ProductSort.Manual);
  });

  it("rejects a missing tag or product", async () => {
    const manual = await create({ type: "manual", title: "Manual" });
    const auto = await create({ type: "automated", title: "Auto", rules: rulesOf(hasTag((await addTag("T")).id)) });

    expect((await rejection(update(auto.id, { rules: rulesOf(hasTag(unknownId)) }))).data?.fieldErrors?.rules).toEqual([
      "One of these tags no longer exists. Please refresh and try again",
    ]);
    expect((await rejection(update(manual.id, { productIds: [unknownId] }))).data?.fieldErrors?.productIds).toEqual([
      "One of these products no longer exists. Please refresh and try again",
    ]);
  });

  it("rolls everything back when the products can't be saved", async () => {
    const product = await addProduct("A");
    const { id } = await create({ type: "manual", title: "Gifts", productIds: [product.id] });

    await rejection(update(id, { title: "Changed", productIds: [unknownId] }));

    expect(await service.get(id)).toMatchObject({ title: "Gifts", productIds: [product.id] });
  });

  it("throws a 404 for an unknown collection", async () => {
    expect((await rejection(update(unknownId, { title: "x" }))).statusCode).toBe(404);
  });

  describe("the locked All collection", () => {
    it("lets the title, description, image and SEO fields change", async () => {
      const updated = await update(ALL_COLLECTION_ID, {
        title: "Everything",
        description: "All of it",
        imageUrl: "/all.jpg",
        imageAlt: "All",
        seoTitle: "Shop everything",
        seoDescription: "Every product",
      });

      expect(updated).toMatchObject({
        title: "Everything",
        handle: "all",
        description: "All of it",
        imageUrl: "/all.jpg",
        imageAlt: "All",
        seoTitle: "Shop everything",
        seoDescription: "Every product",
        locked: true,
      });
    });

    it("rejects a new handle, status, sort or rules as field errors", async () => {
      const error = await rejection(
        update(ALL_COLLECTION_ID, {
          handle: "everything",
          status: "draft",
          defaultSort: "oldest",
          rules: rulesOf(hasTag(unknownId)),
        })
      );

      const message = ["This can't be changed on the all products collection"];
      expect(error.statusCode).toBe(400);
      expect(error.data?.fieldErrors).toEqual({ handle: message, status: message, defaultSort: message, rules: message });
      expect(await service.get(ALL_COLLECTION_ID)).toMatchObject({ handle: "all", status: CollectionStatus.Published, defaultSort: ProductSort.Newest });
    });

    it("rejects a different type and manual products", async () => {
      const error = await rejection(update(ALL_COLLECTION_ID, { type: "manual", productIds: [] }));

      expect(error.data?.fieldErrors).toEqual({
        type: ["The type of a collection can't be changed"],
        productIds: ["Automated collections choose their products with rules"],
      });
    });

    it("accepts the values it already has, so a form can send everything back", async () => {
      const updated = await update(ALL_COLLECTION_ID, { title: "Everything", status: "published", defaultSort: "newest", type: "automated" });

      expect(updated).toMatchObject({ title: "Everything", status: CollectionStatus.Published, defaultSort: ProductSort.Newest });
    });
  });
});

describe("delete", () => {
  it("removes the collection but keeps the products", async () => {
    const product = await addProduct("A");
    const { id } = await create({ type: "manual", title: "Gifts", productIds: [product.id] });

    await service.delete(id);

    expect((await rejection(service.get(id))).statusCode).toBe(404);
    expect(await db.select().from(products)).toHaveLength(1);
  });

  it("throws a 404 for an unknown collection", async () => {
    expect((await rejection(service.delete(unknownId))).statusCode).toBe(404);
  });

  it("refuses to delete the locked All collection", async () => {
    const error = await rejection(service.delete(ALL_COLLECTION_ID));

    expect(error.statusCode).toBe(409);
    expect(error.data?.message).toBe("The all products collection is built in, so it can't be deleted");
    expect(await service.get(ALL_COLLECTION_ID)).toBeDefined();
  });
});

describe("getByHandle", () => {
  it("returns a published collection with its SEO resolved and no rules", async () => {
    await create({
      type: "automated",
      title: "Weddings",
      status: "published",
      description: "For the big day",
      rules: rulesOf(hasTag((await addTag("Wedding")).id)),
    });

    const collection = await service.getByHandle("weddings");

    expect(collection).toMatchObject({ title: "Weddings", handle: "weddings", isDraft: false, seoTitle: "Weddings", seoDescription: "For the big day" });
    expect(collection).not.toHaveProperty("rules");
    expect(collection).not.toHaveProperty("status");
  });

  it("uses the SEO fields when set and cuts a long description for the fallback", async () => {
    await create({ type: "manual", title: "Set", status: "published", seoTitle: "Custom title", seoDescription: "Custom description", description: "Plain" });
    await create({ type: "manual", title: "Long", status: "published", description: "a".repeat(META_DESCRIPTION_LENGTH + 100) });

    expect(await service.getByHandle("set")).toMatchObject({ seoTitle: "Custom title", seoDescription: "Custom description" });
    expect((await service.getByHandle("long")).seoDescription).toHaveLength(META_DESCRIPTION_LENGTH);
  });

  it("returns the All collection", async () => {
    expect(await service.getByHandle("all")).toMatchObject({ id: ALL_COLLECTION_ID, title: "All products", isDraft: false });
  });

  it("says whether the collection is manual or automated", async () => {
    await create({ type: "manual", title: "Picked", status: "published" });
    await create({ type: "automated", title: "Ruled", status: "published", rules: rulesOf(hasTag((await addTag("Rule tag")).id)) });

    expect((await service.getByHandle("picked")).type).toBe("manual");
    expect((await service.getByHandle("ruled")).type).toBe("automated");
  });

  it("hides a draft from visitors but shows it to admins, flagged", async () => {
    await create({ type: "manual", title: "Secret" });

    expect((await rejection(service.getByHandle("secret"))).statusCode).toBe(404);
    expect((await rejection(service.getByHandle("secret", { isAdmin: false }))).statusCode).toBe(404);
    expect(await service.getByHandle("secret", { isAdmin: true })).toMatchObject({ title: "Secret", isDraft: true });
  });

  it("throws a 404 for an unknown handle", async () => {
    expect((await rejection(service.getByHandle("nope", { isAdmin: true }))).statusCode).toBe(404);
  });
});

describe("listProducts", () => {
  const query = (extra: Record<string, unknown> = {}) => ({ page: 1, pageSize: 20, ...extra });

  it("lists every product for the All collection, newest first", async () => {
    await addProduct("Old", { createdAt: new Date(2026, 0, 1) });
    await addProduct("New", { createdAt: new Date(2026, 0, 2) });

    const page = await service.listProducts("all", query());

    expect(titlesOf(page)).toEqual(["New", "Old"]);
    expect(page).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
  });

  it("lists an automated collection's matches using its default sort", async () => {
    const deal = await addTag("Deal");
    const [cheap, dear] = [await addProduct("Cheap", { pricePence: 100 }), await addProduct("Dear", { pricePence: 900 })];
    await addProduct("Other");
    await tagProduct(cheap.id, deal.id);
    await tagProduct(dear.id, deal.id);
    await create({ type: "automated", title: "Deals", status: "published", defaultSort: "price-desc", rules: rulesOf(hasTag(deal.id)) });

    const page = await service.listProducts("deals", query());

    expect(titlesOf(page)).toEqual(["Dear", "Cheap"]);
  });

  it("lets the sort in the query override the default", async () => {
    const deal = await addTag("Deal");
    const [cheap, dear] = [await addProduct("Cheap", { pricePence: 100 }), await addProduct("Dear", { pricePence: 900 })];
    await tagProduct(cheap.id, deal.id);
    await tagProduct(dear.id, deal.id);
    await create({ type: "automated", title: "Deals", status: "published", defaultSort: "price-desc", rules: rulesOf(hasTag(deal.id)) });

    expect(titlesOf(await service.listProducts("deals", query({ sort: ProductSort.PriceAsc })))).toEqual(["Cheap", "Dear"]);
  });

  it("lists a manual collection in the order the products were added when sorted manually", async () => {
    const [a, b, c] = [await addProduct("A"), await addProduct("B"), await addProduct("C")];
    await addProduct("Left out");
    await create({ type: "manual", title: "Picks", status: "published", defaultSort: "manual", productIds: [c.id, a.id, b.id] });

    expect(titlesOf(await service.listProducts("picks", query()))).toEqual(["C", "A", "B"]);
    expect(titlesOf(await service.listProducts("picks", query({ sort: ProductSort.TitleDesc })))).toEqual(["C", "B", "A"]);
  });

  it("rejects manual order on an automated collection", async () => {
    const error = await rejection(service.listProducts("all", query({ sort: ProductSort.Manual })));

    expect(error.statusCode).toBe(400);
    expect(error.data?.fieldErrors?.sort).toEqual(["Manual order is only available for collections where you pick the products"]);
  });

  it("narrows to the selected tag, and an unknown tag gives nothing", async () => {
    const [gifts, sale] = [await addTag("Gifts"), await addTag("Sale")];
    const [a, b] = [await addProduct("A", { createdAt: new Date(2026, 0, 2) }), await addProduct("B", { createdAt: new Date(2026, 0, 1) })];
    await tagProduct(a.id, gifts.id);
    await tagProduct(b.id, sale.id);
    await tagProduct(b.id, gifts.id);
    await create({ type: "automated", title: "Sale items", status: "published", rules: rulesOf(hasTag(sale.id)) });

    expect(titlesOf(await service.listProducts("sale-items", query({ tag: "gifts" })))).toEqual(["B"]);
    expect(titlesOf(await service.listProducts("all", query({ tag: "gifts" })))).toEqual(["A", "B"]);
    expect((await service.listProducts("all", query({ tag: "nope" }))).total).toBe(0);
  });

  it("pages the results and only sends facets with the first page", async () => {
    const filter = await addTag("Filter", { showInFilter: true });
    for (const title of ["A", "B", "C"]) {
      await tagProduct((await addProduct(title)).id, filter.id);
    }

    const first = await service.listProducts("all", query({ pageSize: 2 }));
    const second = await service.listProducts("all", query({ page: 2, pageSize: 2 }));

    expect(first.items).toHaveLength(2);
    expect(first.facets).toEqual({ tags: [expect.objectContaining({ slug: "filter", count: 3 })] });
    expect(second.items).toHaveLength(1);
    expect(second.totalPages).toBe(2);
    expect(second).not.toHaveProperty("facets");
  });

  it("keeps the other tags in the facets when one is selected, and counts only the collection's products", async () => {
    const [gifts, sale] = [await addTag("Gifts", { showInFilter: true, priority: 2 }), await addTag("Sale", { showInFilter: true })];
    const [a, b, outside] = [await addProduct("A"), await addProduct("B"), await addProduct("Outside")];
    await tagProduct(a.id, gifts.id);
    await tagProduct(b.id, gifts.id);
    await tagProduct(b.id, sale.id);
    await tagProduct(outside.id, sale.id);
    await create({ type: "manual", title: "Picks", status: "published", productIds: [a.id, b.id] });

    const page = await service.listProducts("picks", query({ tag: "sale" }));

    expect(titlesOf(page)).toEqual(["B"]);
    expect(page.facets?.tags.map(facet => [facet.slug, facet.count])).toEqual([
      ["gifts", 2],
      ["sale", 1],
    ]);
  });

  it("gives public cards only the tags marked for cards", async () => {
    const [onCard, hidden] = [await addTag("Card", { showOnCards: true }), await addTag("Hidden")];
    const product = await addProduct("A");
    await tagProduct(product.id, onCard.id);
    await tagProduct(product.id, hidden.id);

    const page = await service.listProducts("all", query());

    expect(page.items[0]?.tags.map(tag => tag.name)).toEqual(["Card"]);
    expect(page.items[0]?.tags[0]).not.toHaveProperty("showOnCards");
  });

  it("hides a draft's products from visitors but not from admins", async () => {
    await addProduct("A");
    await create({ type: "automated", title: "Draft", rules: rulesOf({ type: RuleType.Retailer, operator: RetailerOperator.IsNot, retailer: "None" }) });

    expect((await rejection(service.listProducts("draft", query()))).statusCode).toBe(404);
    expect((await service.listProducts("draft", query(), { isAdmin: true })).total).toBe(1);
  });

  it("throws a 404 for an unknown collection", async () => {
    expect((await rejection(service.listProducts("nope", query()))).statusCode).toBe(404);
  });

  it("becomes visible once published", async () => {
    const { id } = await create({ type: "manual", title: "Soon" });
    expect((await rejection(service.listProducts("soon", query()))).statusCode).toBe(404);

    await update(id, { status: "published" });
    expect((await service.listProducts("soon", query())).total).toBe(0);
  });
});

describe("preview", () => {
  it("returns the total and the first 12 matches", async () => {
    for (let i = 1; i <= 14; i++) {
      await addProduct(`Product ${String(i).padStart(2, "0")}`, { retailer: "Etsy", createdAt: new Date(2026, 0, i) });
    }
    await addProduct("Elsewhere", { retailer: "Amazon" });
    const rules = rulesOf({ type: RuleType.Retailer, operator: RetailerOperator.Is, retailer: "Etsy" });

    const preview = await service.preview({ rules, sort: ProductSort.Oldest });

    expect(preview.total).toBe(14);
    expect(preview.items).toHaveLength(12);
    expect(preview.items[0]?.title).toBe("Product 01");
  });

  it("is empty when nothing matches", async () => {
    const rules = rulesOf({ type: RuleType.Retailer, operator: RetailerOperator.Is, retailer: "Nobody" });

    expect(await service.preview({ rules, sort: ProductSort.Newest })).toEqual({ total: 0, items: [] });
  });

  it("rejects a tag that no longer exists", async () => {
    const error = await rejection(service.preview({ rules: rulesOf(hasTag(unknownId)), sort: ProductSort.Newest }));

    expect(error.data?.fieldErrors?.rules).toEqual(["One of these tags no longer exists. Please refresh and try again"]);
  });
});
