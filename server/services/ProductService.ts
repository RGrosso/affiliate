import type { z } from "#shared/schemas/zod";
import type { addProductSchema } from "#shared/schemas/products.schema";
import type { PageQuery } from "#shared/schemas/pagination.schema";
import type { ProductListItem } from "#shared/types/product";

const SEEDED_KEY = "sample_products_seeded";

type ProductInput = z.output<typeof addProductSchema>;

export class ProductService {
  private readonly products: ProductRepository;

  constructor(private readonly db: DbExecutor) {
    this.products = new ProductRepository(db);
  }

  async list(query: PageQuery) {
    const [{ items, total }, sampleCount] = await Promise.all([
      this.products.findPage(query),
      this.products.countSamples(),
    ]);
    const featured = await this.products.findFeaturedImages(items.map(item => item.id));

    const withImages: ProductListItem[] = items.map(item => ({ ...item, image: featured.get(item.id) ?? null }));

    return { ...toPagedResult(withImages, total, query), sampleCount };
  }

  async get(id: string) {
    const product = await this.products.findWithImages(id);
    if (!product) {
      throw productNotFound();
    }

    return product;
  }

  async create(input: ProductInput, authorId: string) {
    const values = toProductValues(input);

    return this.db.transaction(async (tx) => {
      const products = new ProductRepository(tx);
      const product = await products.insert({ ...values, authorId });
      await products.insertImages(toImageValues(product.id, input.images));
      return product;
    }).catch(rethrowAsDuplicateHandle);
  }

  /** Replaces the fields and images. `isSample` isn't editable, so a sample stays a sample. */
  async update(id: string, input: ProductInput) {
    const values = toProductValues(input);

    const updated = await this.db.transaction(async (tx) => {
      const products = new ProductRepository(tx);
      const product = await products.update(id, values);
      if (!product) return undefined;

      await products.replaceImages(id, toImageValues(id, input.images));
      return product;
    }).catch(rethrowAsDuplicateHandle);

    if (!updated) {
      throw productNotFound();
    }

    return this.get(id);
  }

  deleteSamples() {
    return this.products.deleteSamples();
  }

  /**
   * Inserts the sample products once. A settings flag records that seeding has been decided,
   * so deleting the samples never brings them back. A store that already has products is
   * never seeded: it's marked as done instead, so samples don't appear among real products.
   */
  async seedSamplesOnce(authorId: string) {
    if (await new SettingsRepository(this.db).get(SEEDED_KEY)) return;

    await this.db.transaction(async (tx) => {
      const products = new ProductRepository(tx);
      const settings = new SettingsRepository(tx);

      if (await products.count() > 0) {
        await settings.setIfMissing(SEEDED_KEY, "skipped: store already had products");
        return;
      }

      const inserted = await products.insertSamples(sampleProducts.map(sample => ({
        title: sample.title,
        handle: sample.handle,
        pricePence: sample.pricePence,
        description: sample.description,
        retailer: sample.retailer,
        affiliateUrl: `https://example.com/products/${sample.handle}`,
        seoTitle: sample.title,
        seoDescription: sample.seoDescription,
        isSample: true,
        authorId,
      })));

      await products.insertImages(inserted.flatMap(({ id, handle }) => {
        const sample = sampleProducts.find(s => s.handle === handle)!;
        return Array.from({ length: sample.imageCount }, (_, position) => ({
          productId: id,
          url: sampleImageUrl(handle, position + 1),
          alt: sample.title,
          position,
        }));
      }));

      await settings.setIfMissing(SEEDED_KEY, new Date().toISOString());
    });
  }
}
