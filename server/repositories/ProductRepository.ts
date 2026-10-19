import { and, asc, count, desc, eq, exists, inArray, isNotNull, ne, sql, type SQL } from "drizzle-orm";
import { collectionProducts, productImages, productTags, products, tags } from "hub:db:schema";
import { compileRules } from "./collectionRuleConditions";
import { tagColumns } from "./TagRepository";
import type { StoredCollectionRules } from "../utils/storedCollectionRules";
import type { ProductListQuery } from "#shared/schemas/products.schema";
import type { PgColumn } from "drizzle-orm/pg-core";
import { ProductSort, type TagFacet } from "#shared/types/collection";
import type { ProductImage, ProductListItem } from "#shared/types/product";

export type NewProduct = typeof products.$inferInsert;
export type NewProductImage = typeof productImages.$inferInsert;

const listColumns = {
  id: products.id,
  title: products.title,
  handle: products.handle,
  description: products.description,
  pricePence: products.pricePence,
  retailer: products.retailer,
  affiliateUrl: products.affiliateUrl,
  createdAt: products.createdAt,
} satisfies Record<Exclude<keyof ProductListItem, "image" | "tags">, PgColumn>;

export type ProductScope = {
  rules?: StoredCollectionRules | null;
  collectionId?: string;
};

const lowerTitle = sql`lower(${products.title})`;
// Postgres sorts nulls first when descending, so unpriced products are pushed last explicitly
const price = (direction: "asc" | "desc") => sql`${products.pricePence} ${sql.raw(direction)} nulls last`;

const sortOrders: Record<ProductSort, (collectionId?: string) => SQL[]> = {
  [ProductSort.Newest]: () => [desc(products.createdAt), asc(products.title), asc(products.id)],
  [ProductSort.Oldest]: () => [asc(products.createdAt), asc(products.title), asc(products.id)],
  [ProductSort.PriceAsc]: () => [price("asc"), asc(products.title), asc(products.id)],
  [ProductSort.PriceDesc]: () => [price("desc"), asc(products.title), asc(products.id)],
  [ProductSort.TitleAsc]: () => [asc(lowerTitle), asc(products.title), asc(products.id)],
  [ProductSort.TitleDesc]: () => [desc(lowerTitle), asc(products.title), asc(products.id)],
  [ProductSort.Manual]: collectionId => {
    if (!collectionId) throw new Error("Manual order needs a collection");

    const position = sql`(select ${collectionProducts.position} from ${collectionProducts} where ${and(
      eq(collectionProducts.collectionId, collectionId),
      eq(collectionProducts.productId, products.id)
    )})`;
    return [asc(position), asc(products.title), asc(products.id)];
  },
};

export class ProductRepository {
  constructor(private readonly db: DbExecutor) {}

  async findById(id: string) {
    const [product] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);

    return product;
  }

  async findWithImages(id: string) {
    const product = await this.findById(id);
    if (!product) return undefined;

    return { ...product, images: await this.findImages(id) };
  }

  async findByHandleWithImages(handle: string) {
    const [product] = await this.db.select().from(products).where(eq(products.handle, handle)).limit(1);
    if (!product) return undefined;

    return { ...product, images: await this.findImages(product.id) };
  }

  private findImages(productId: string): Promise<ProductImage[]> {
    return this.db
      .select({
        url: productImages.url,
        alt: productImages.alt,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position));
  }

  /** Products in a collection: the manual list when `collectionId` is given, otherwise those matching `rules` (all of them for none). */
  private inScope({ rules, collectionId }: ProductScope) {
    return collectionId
      ? exists(
          this.db
            .select({ one: collectionProducts.productId })
            .from(collectionProducts)
            .where(and(eq(collectionProducts.collectionId, collectionId), eq(collectionProducts.productId, products.id)))
        )
      : compileRules(this.db, rules ?? null);
  }

  /** Newest first unless `sort` says otherwise. Ties fall back to the title, then the id, so pages don't shuffle between requests. */
  async findPage(query: ProductListQuery, { sort = ProductSort.Newest, ...scope }: ProductScope & { sort?: ProductSort } = {}) {
    const tagFilter = query.tag?.length
      ? exists(
          this.db
            .select({ one: productTags.productId })
            .from(productTags)
            .innerJoin(tags, eq(tags.id, productTags.tagId))
            .where(and(eq(productTags.productId, products.id), inArray(tags.slug, query.tag)))
        )
      : undefined;
    const filter = and(tagFilter, this.inScope(scope));

    const [items, [totals]] = await Promise.all([
      this.db
        .select(listColumns)
        .from(products)
        .where(filter)
        .orderBy(...sortOrders[sort](scope.collectionId))
        .limit(query.pageSize)
        .offset(pageOffset(query)),
      this.db.select({ total: count() }).from(products).where(filter),
    ]);

    return { items, total: totals?.total ?? 0 };
  }

  async countMatching(scope: ProductScope) {
    const [result] = await this.db.select({ total: count() }).from(products).where(this.inScope(scope));
    return result?.total ?? 0;
  }

  /**
   * Tags that visitors can filter by (`showInFilter`) and that are on at least one product in the scope,
   * with how many, highest priority first. Counted over the whole scope, so choosing a tag doesn't hide the others.
   */
  async findTagFacets(scope: ProductScope): Promise<TagFacet[]> {
    const rows = await this.db
      .select({ ...tagColumns, count: count() })
      .from(tags)
      .innerJoin(productTags, eq(productTags.tagId, tags.id))
      .innerJoin(products, eq(products.id, productTags.productId))
      .where(and(eq(tags.showInFilter, true), this.inScope(scope)))
      .groupBy(tags.id);

    return sortTagsByPriority(rows).map(({ count, ...tag }) => ({ ...toTagBadge(tag), count }));
  }

  /** The distinct shops products link to, for choosing a retailer in a rule. */
  async findRetailers() {
    const rows = await this.db
      .selectDistinct({ retailer: products.retailer })
      .from(products)
      .where(and(isNotNull(products.retailer), ne(products.retailer, "")))
      .orderBy(asc(products.retailer));

    return rows.map(row => row.retailer!);
  }

  /** Which of these ids are products, so a stale list can be caught before the foreign key fails. */
  async findExistingIds(ids: string[]) {
    if (!ids.length) return [];

    const rows = await this.db.select({ id: products.id }).from(products).where(inArray(products.id, ids));
    return rows.map(row => row.id);
  }

  /** Each product's lowest-position image, keyed by product id. */
  async findFeaturedImages(productIds: string[]) {
    const featured = new Map<string, ProductImage>();
    if (!productIds.length) return featured;

    const images = await this.db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        alt: productImages.alt,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.position));

    for (const image of images) {
      if (!featured.has(image.productId)) {
        featured.set(image.productId, { url: image.url, alt: image.alt });
      }
    }

    return featured;
  }

  async count() {
    const [result] = await this.db.select({ count: count() }).from(products);
    return result?.count ?? 0;
  }

  async insert(values: NewProduct) {
    const [product] = await this.db.insert(products).values(values).returning();
    return product!;
  }

  /** Skips handles that are already taken, so only the rows actually inserted come back. */
  insertSamples(values: NewProduct[]) {
    return this.db.insert(products).values(values).onConflictDoNothing({ target: products.handle }).returning({ id: products.id, handle: products.handle });
  }

  async update(id: string, values: Partial<NewProduct>) {
    const [product] = await this.db.update(products).set(values).where(eq(products.id, id)).returning({ id: products.id });

    return product;
  }

  async insertImages(images: NewProductImage[]) {
    if (images.length) {
      await this.db.insert(productImages).values(images);
    }
  }

  async replaceImages(productId: string, images: NewProductImage[]) {
    await this.db.delete(productImages).where(eq(productImages.productId, productId));
    await this.insertImages(images);
  }
}
