import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { productImages, products } from "hub:db:schema";
import { z } from "#shared/schemas/zod";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export default defineApiHandler(async (event) => {
  const query = querySchema.safeParse(getQuery(event));
  if (!query.success) {
    throw validationError(query.error);
  }
  const { limit } = query.data;

  const listQuery = db.select({
    id: products.id,
    title: products.title,
    handle: products.handle,
    description: products.description,
    pricePence: products.pricePence,
    retailer: products.retailer,
    affiliateUrl: products.affiliateUrl,
    isSample: products.isSample,
    createdAt: products.createdAt,
  })
    .from(products)
    .orderBy(desc(products.createdAt), asc(products.title))
    .$dynamic();

  const rows = await (limit ? listQuery.limit(limit) : listQuery);

  const [samples] = await db.select({ count: count() })
    .from(products)
    .where(eq(products.isSample, true));

  const images = rows.length === 0
    ? []
    : await db.select({
        productId: productImages.productId,
        url: productImages.url,
        alt: productImages.alt,
      })
        .from(productImages)
        .where(inArray(productImages.productId, rows.map(row => row.id)))
        .orderBy(asc(productImages.position));

  // The lowest-position image is the featured one
  const featured = new Map<string, { url: string; alt: string | null }>();
  for (const image of images) {
    if (!featured.has(image.productId)) {
      featured.set(image.productId, { url: image.url, alt: image.alt });
    }
  }

  return ok({
    products: rows.map(row => ({ ...row, image: featured.get(row.id) ?? null })),
    sampleCount: samples?.count ?? 0,
  });
});
