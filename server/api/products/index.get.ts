import { asc, desc } from "drizzle-orm";
import { productImages, products } from "hub:db:schema";

export default defineApiHandler(async () => {
  const rows = await db.select({
    id: products.id,
    title: products.title,
    handle: products.handle,
    description: products.description,
    priceCents: products.priceCents,
    retailer: products.retailer,
    affiliateUrl: products.affiliateUrl,
    isSample: products.isSample,
    createdAt: products.createdAt,
  })
    .from(products)
    .orderBy(desc(products.createdAt), asc(products.title));

  const images = await db.select({
    productId: productImages.productId,
    url: productImages.url,
    alt: productImages.alt,
  })
    .from(productImages)
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
    sampleCount: rows.filter(row => row.isSample).length,
  });
});
