import { asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { collectionProducts, collections, tags } from "hub:db:schema";
import { STORED_TAG_ID_KEY } from "../utils/storedCollectionRules";
import type { CollectionSummary } from "#shared/types/collection";

export type NewCollection = typeof collections.$inferInsert;

export class CollectionRepository {
  constructor(private readonly db: DbExecutor) {}

  /** The locked All collection first, then alphabetically. */
  findAll() {
    return this.db.select()
      .from(collections)
      .orderBy(desc(collections.locked), asc(collections.title), asc(collections.id));
  }

  async findById(id: string) {
    const [collection] = await this.db.select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);

    return collection;
  }

  async findByHandle(handle: string) {
    const [collection] = await this.db.select()
      .from(collections)
      .where(eq(collections.handle, handle))
      .limit(1);

    return collection;
  }

  async insert(values: NewCollection) {
    const [collection] = await this.db.insert(collections).values(values).returning();
    return collection!;
  }

  async update(id: string, values: Partial<NewCollection>) {
    const [collection] = await this.db.update(collections)
      .set(values)
      .where(eq(collections.id, id))
      .returning({ id: collections.id });

    return collection;
  }

  /** The hand-picked products go with it through the collection_products ON DELETE CASCADE foreign key. */
  async delete(id: string) {
    const deleted = await this.db.delete(collections)
      .where(eq(collections.id, id))
      .returning({ id: collections.id });

    return deleted.length > 0;
  }

  /** The position is the index in `productIds`, so the order they are given is the manual order. */
  async replaceProducts(collectionId: string, productIds: string[]) {
    await this.db.delete(collectionProducts).where(eq(collectionProducts.collectionId, collectionId));

    const unique = [...new Set(productIds)];
    if (unique.length) {
      await this.db.insert(collectionProducts).values(unique.map((productId, position) => ({ collectionId, productId, position })));
    }
  }

  /** Product ids in manual order. */
  async findProductIds(collectionId: string) {
    const rows = await this.db.select({ productId: collectionProducts.productId })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, collectionId))
      .orderBy(asc(collectionProducts.position));

    return rows.map(row => row.productId);
  }

  /** How many hand-picked products each collection has. Collections with none are missing from the map. */
  async countProducts() {
    const rows = await this.db.select({ collectionId: collectionProducts.collectionId, total: count() })
      .from(collectionProducts)
      .groupBy(collectionProducts.collectionId);

    return new Map(rows.map(row => [row.collectionId, row.total]));
  }

  /** The collections whose rules mention each tag, by title. Tags no collection uses are missing from the map. */
  async findUsingTags(tagIds: string[]) {
    const byTag = new Map<string, CollectionSummary[]>();
    if (!tagIds.length) return byTag;

    // Looks for the tag id anywhere in the rules, so it also finds tags inside subgroups
    const mentionsTag = sql`jsonb_path_exists(
      ${collections.rules},
      ${`$.** ? (@.${STORED_TAG_ID_KEY} == $tag)`}::jsonpath,
      jsonb_build_object('tag', ${tags.id}::text)
    )`;
    const rows = await this.db.select({ tagId: tags.id, id: collections.id, title: collections.title })
      .from(tags)
      .innerJoin(collections, mentionsTag)
      .where(inArray(tags.id, tagIds))
      .orderBy(asc(collections.title), asc(collections.id));

    for (const { tagId, ...collection } of rows) {
      const list = byTag.get(tagId);
      if (list) list.push(collection);
      else byTag.set(tagId, [collection]);
    }

    return byTag;
  }

  async findUsingTag(tagId: string) {
    return (await this.findUsingTags([tagId])).get(tagId) ?? [];
  }
}
