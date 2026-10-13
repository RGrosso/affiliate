import type { z } from "#shared/schemas/zod";
import type { addProductSchema } from "#shared/schemas/products.schema";
import type { PageQuery } from "#shared/schemas/pagination.schema";
import type { ProductListItem } from "#shared/types/product";

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
      throw notFound("We couldn't find that product");
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
      throw notFound("We couldn't find that product");
    }

    return this.get(id);
  }

  deleteSamples() {
    return this.products.deleteSamples();
  }
}
