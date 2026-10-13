import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { productImages, products } from "hub:db:schema";
import type { PageQuery } from "#shared/schemas/pagination.schema";
import type { ProductImage } from "#shared/types/product";

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
};

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

    const images = await this.db.select({
      url: productImages.url,
      alt: productImages.alt,
    })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position));

    return { ...product, images };
  }

  /** Newest first. The title breaks ties so pages don't shuffle between requests. */
  async findPage(query: PageQuery) {
    const [items, [totals]] = await Promise.all([
      this.db.select(listColumns)
        .from(products)
        .orderBy(desc(products.createdAt), asc(products.title), asc(products.id))
        .limit(query.pageSize)
        .offset(pageOffset(query)),
      this.db.select({ total: count() }).from(products),
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

  async insert(values: NewProduct) {
    const [product] = await this.db.insert(products).values(values).returning();
    return product!;
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
