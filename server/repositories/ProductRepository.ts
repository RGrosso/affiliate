import { and, asc, count, desc, eq, exists, inArray } from "drizzle-orm";
import { productImages, productTags, products, tags } from "hub:db:schema";
import type { ProductListQuery } from "#shared/schemas/products.schema";
import type { PgColumn } from "drizzle-orm/pg-core";
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
  isSample: products.isSample,
  createdAt: products.createdAt,
} satisfies Record<Exclude<keyof ProductListItem, "image" | "tags">, PgColumn>;

export class ProductRepository {
  constructor(private readonly db: DbExecutor) {}

  async findById(id: string) {
    const [product] = await this.db.select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return product;
  }

  async findWithImages(id: string) {
    const product = await this.findById(id);
    if (!product) return undefined;

    return { ...product, images: await this.findImages(id) };
  }

  async findByHandleWithImages(handle: string) {
    const [product] = await this.db.select()
      .from(products)
      .where(eq(products.handle, handle))
      .limit(1);
    if (!product) return undefined;

    return { ...product, images: await this.findImages(product.id) };
  }

  private findImages(productId: string): Promise<ProductImage[]> {
    return this.db.select({
      url: productImages.url,
      alt: productImages.alt,
    })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position));
  }

  /** Newest first. The title breaks ties so pages don't shuffle between requests. */
  async findPage(query: ProductListQuery) {
    const filter = query.tag?.length
      ? exists(this.db.select({ one: productTags.productId })
          .from(productTags)
          .innerJoin(tags, eq(tags.id, productTags.tagId))
          .where(and(eq(productTags.productId, products.id), inArray(tags.slug, query.tag))))
      : undefined;

    const [items, [totals]] = await Promise.all([
      this.db.select(listColumns)
        .from(products)
        .where(filter)
        .orderBy(desc(products.createdAt), asc(products.title), asc(products.id))
        .limit(query.pageSize)
        .offset(pageOffset(query)),
      this.db.select({ total: count() }).from(products).where(filter),
    ]);

    return { items, total: totals?.total ?? 0 };
  }

  /** Each product's lowest-position image, keyed by product id. */
  async findFeaturedImages(productIds: string[]) {
    const featured = new Map<string, ProductImage>();
    if (!productIds.length) return featured;

    const images = await this.db.select({
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

  async countSamples() {
    const [result] = await this.db.select({ count: count() })
      .from(products)
      .where(eq(products.isSample, true));

    return result?.count ?? 0;
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
    return this.db.insert(products)
      .values(values)
      .onConflictDoNothing({ target: products.handle })
      .returning({ id: products.id, handle: products.handle });
  }

  async update(id: string, values: Partial<NewProduct>) {
    const [product] = await this.db.update(products)
      .set(values)
      .where(eq(products.id, id))
      .returning({ id: products.id });

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

  /** Images go with them through the product_images ON DELETE CASCADE foreign key. */
  async deleteSamples() {
    const deleted = await this.db.delete(products)
      .where(eq(products.isSample, true))
      .returning({ id: products.id });

    return deleted.length;
  }
}
