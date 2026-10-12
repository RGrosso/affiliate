import { eq } from "drizzle-orm";
import type { User } from "#auth-utils";
import { productImages, products, settings } from "hub:db:schema";

const SEEDED_KEY = "sample_products_seeded";

/**
 * Inserts the sample products the first time it runs. A settings flag records that it ran,
 * so deleting the samples later never brings them back.
 */
export async function seedSampleProductsOnce(authorId: string) {
  const [seeded] = await db.select()
    .from(settings)
    .where(eq(settings.key, SEEDED_KEY))
    .limit(1);

  if (seeded) return;

  await db.transaction(async (tx) => {
    const inserted = await tx.insert(products)
      .values(sampleProducts.map(sample => ({
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
      })))
      .onConflictDoNothing({ target: products.handle })
      .returning({ id: products.id, handle: products.handle });

    const images = inserted.flatMap(({ id, handle }) => {
      const sample = sampleProducts.find(s => s.handle === handle)!;
      return Array.from({ length: sample.imageCount }, (_, position) => ({
        productId: id,
        url: sampleImageUrl(handle, position + 1),
        alt: sample.title,
        position,
      }));
    });

    if (images.length) {
      await tx.insert(productImages).values(images);
    }

    await tx.insert(settings)
      .values({ key: SEEDED_KEY, value: new Date().toISOString() })
      .onConflictDoNothing();
  });
}

/** Seeds the sample products when an admin logs in. Never blocks the login if it fails. */
export async function seedSampleProductsForAdmin(user: User) {
  if (user.role !== "admin") return;

  try {
    await seedSampleProductsOnce(user.id);
  } catch (error) {
    console.error("[seed] Failed to seed sample products", error);
  }
}
