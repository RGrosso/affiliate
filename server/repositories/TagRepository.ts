import { asc, count, eq, inArray } from "drizzle-orm";
import { productTags, tags } from "hub:db:schema";
import type { AdminTag, Tag } from "#shared/types/tag";

export type NewTag = Pick<typeof tags.$inferInsert, "name" | "slug" | "description" | "tooltip" | "icon" | "priority" | "showOnCards">;

const tagColumns = {
  id: tags.id,
  name: tags.name,
  slug: tags.slug,
  description: tags.description,
  tooltip: tags.tooltip,
  icon: tags.icon,
  priority: tags.priority,
  showOnCards: tags.showOnCards,
} satisfies Record<keyof Tag, unknown>;

export class TagRepository {
  constructor(private readonly db: DbExecutor) {}

  findAll(): Promise<AdminTag[]> {
    return this.db.select({ ...tagColumns, productCount: count(productTags.productId) })
      .from(tags)
      .leftJoin(productTags, eq(productTags.tagId, tags.id))
      .groupBy(tags.id)
      .orderBy(asc(tags.name), asc(tags.id));
  }

  async findById(id: string): Promise<Tag | undefined> {
    const [tag] = await this.db.select(tagColumns)
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    return tag;
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (!ids.length) return [];

    return this.db.select(tagColumns).from(tags).where(inArray(tags.id, ids));
  }

  /** Each product's tags, highest priority first, keyed by product id. */
  async findForProducts(productIds: string[]) {
    const byProduct = new Map<string, Tag[]>();
    if (!productIds.length) return byProduct;

    const rows = await this.db.select({ productId: productTags.productId, ...tagColumns })
      .from(productTags)
      .innerJoin(tags, eq(tags.id, productTags.tagId))
      .where(inArray(productTags.productId, productIds));

    for (const { productId, ...tag } of rows) {
      const list = byProduct.get(productId);
      if (list) list.push(tag);
      else byProduct.set(productId, [tag]);
    }

    for (const [productId, list] of byProduct) {
      byProduct.set(productId, sortTagsByPriority(list));
    }

    return byProduct;
  }

  async insert(values: NewTag): Promise<Tag> {
    const [tag] = await this.db.insert(tags).values(values).returning(tagColumns);
    return tag!;
  }

  async update(id: string, values: Partial<NewTag>): Promise<Tag | undefined> {
    const [tag] = await this.db.update(tags)
      .set(values)
      .where(eq(tags.id, id))
      .returning(tagColumns);

    return tag;
  }

  /** Product links go with it through the product_tags ON DELETE CASCADE foreign key. */
  async delete(id: string) {
    const deleted = await this.db.delete(tags)
      .where(eq(tags.id, id))
      .returning({ id: tags.id });

    return deleted.length > 0;
  }

  async replaceForProduct(productId: string, tagIds: string[]) {
    await this.db.delete(productTags).where(eq(productTags.productId, productId));

    const unique = [...new Set(tagIds)];
    if (unique.length) {
      await this.db.insert(productTags).values(unique.map(tagId => ({ productId, tagId })));
    }
  }
}
