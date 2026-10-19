import type { z } from "#shared/schemas/zod";
import type { addProductSchema, ProductListQuery } from "#shared/schemas/products.schema";
import type { ProductDetail, ProductListItem } from "#shared/types/product";

const SEEDED_KEY = "sample_products_seeded";

type ProductInput = z.output<typeof addProductSchema>;

export class ProductService {
  private readonly products: ProductRepository;
  private readonly tags: TagRepository;

  constructor(private readonly db: DbExecutor) {
    this.products = new ProductRepository(db);
    this.tags = new TagRepository(db);
  }

  /** Public lists carry only the badges a card shows; admins get every tag. */
  async list(query: ProductListQuery, { forAdmin = false }: { forAdmin?: boolean } = {}) {
    const { items, total } = await this.products.findPage(query);
    const listItems = await this.toListItems(items, { forAdmin });

    return toPagedResult(listItems, total, query);
  }

  /** Adds each product's featured image and tags to the rows a list query returns. */
  async toListItems(items: Awaited<ReturnType<ProductRepository["findPage"]>>["items"], { forAdmin = false }: { forAdmin?: boolean } = {}) {
    const ids = items.map(item => item.id);
    const [featured, tags] = await Promise.all([this.products.findFeaturedImages(ids), this.tags.findForProducts(ids)]);

    return items.map((item): ProductListItem => ({
      ...item,
      image: featured.get(item.id) ?? null,
      tags: forAdmin ? sortTagsByPriority(tags.get(item.id) ?? []).map(toTagBadge) : pickCardTags(tags.get(item.id) ?? []),
    }));
  }

  findRetailers() {
    return this.products.findRetailers();
  }

  async get(id: string) {
    const product = await this.products.findWithImages(id);
    if (!product) {
      throw productNotFound();
    }

    const tags = (await this.tags.findForProducts([id])).get(id) ?? [];

    return { ...product, tags, tagIds: tags.map(tag => tag.id) };
  }

  /** The public product page: every tag as a badge, and the description made safe to render. */
  async getByHandle(handle: string): Promise<ProductDetail> {
    const product = await this.products.findByHandleWithImages(handle);
    if (!product) {
      throw productNotFound();
    }

    const tags = (await this.tags.findForProducts([product.id])).get(product.id) ?? [];

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: sanitiseRichText(product.description),
      brand: product.brand,
      pricePence: product.pricePence,
      retailer: product.retailer,
      affiliateUrl: product.affiliateUrl,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      images: product.images,
      tags: sortTagsByPriority(tags).map(toTagBadge),
    };
  }

  async create(input: ProductInput, authorId: string) {
    const values = toProductValues(input);

    return this.db
      .transaction(async tx => {
        const products = new ProductRepository(tx);
        const tags = new TagRepository(tx);
        await this.assertTagsExist(tags, input.tagIds);

        const product = await products.insert({ ...values, authorId });
        await products.insertImages(toImageValues(product.id, input.images));
        await tags.replaceForProduct(product.id, input.tagIds);
        return product;
      })
      .catch(rethrowAsDuplicateHandle);
  }

  /** Replaces the fields, images and tags. `isSample` isn't editable, so a sample stays a sample. */
  async update(id: string, input: ProductInput) {
    const values = toProductValues(input);

    const updated = await this.db
      .transaction(async tx => {
        const products = new ProductRepository(tx);
        const tags = new TagRepository(tx);
        await this.assertTagsExist(tags, input.tagIds);

        const product = await products.update(id, values);
        if (!product) return undefined;

        await products.replaceImages(id, toImageValues(id, input.images));
        await tags.replaceForProduct(id, input.tagIds);
        return product;
      })
      .catch(rethrowAsDuplicateHandle);

    if (!updated) {
      throw productNotFound();
    }

    return this.get(id);
  }

  /** Catches a tag deleted since the form loaded, which would otherwise fail on the foreign key. */
  private async assertTagsExist(tags: TagRepository, tagIds: string[]) {
    const unique = new Set(tagIds);
    if (!unique.size) return;

    if ((await tags.findByIds([...unique])).length !== unique.size) {
      throw apiError("VALIDATION_ERROR", "Please check the highlighted fields and try again", {
        tagIds: ["One of these tags no longer exists. Please refresh and try again"],
      });
    }
  }

  /**
   * Inserts the sample products once. A settings flag records that seeding has been decided,
   * so deleting the samples never brings them back. A store that already has products is
   * never seeded: it's marked as done instead, so samples don't appear among real products.
   */
  async seedSamplesOnce(authorId: string) {
    if (await new SettingsRepository(this.db).get(SEEDED_KEY)) return;

    await this.db.transaction(async tx => {
      const products = new ProductRepository(tx);
      const settings = new SettingsRepository(tx);

      if ((await products.count()) > 0) {
        await settings.setIfMissing(SEEDED_KEY, "skipped: store already had products");
        return;
      }

      const inserted = await products.insertSamples(
        sampleProducts.map(sample => ({
          title: sample.title,
          handle: sample.handle,
          pricePence: sample.pricePence,
          description: sample.description,
          retailer: sample.retailer,
          brand: sample.brand,
          affiliateUrl: `https://example.com/products/${sample.handle}`,
          seoTitle: sample.title,
          seoDescription: sample.seoDescription,
          isSample: true,
          authorId,
        }))
      );

      await products.insertImages(
        inserted.flatMap(({ id, handle }) => {
          const sample = sampleProducts.find(s => s.handle === handle)!;
          return Array.from({ length: sample.imageCount }, (_, position) => ({
            productId: id,
            url: sampleImageUrl(handle, position + 1),
            alt: sample.title,
            position,
          }));
        })
      );

      await settings.setIfMissing(SEEDED_KEY, new Date().toISOString());
    });
  }
}
