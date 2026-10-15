import type { User } from "#auth-utils";

/** Never blocks the login if it fails. */
export async function seedSampleProductsForAdmin(user: User) {
  if (user.role !== "admin" || !useRuntimeConfig().seedSamples) return;

  try {
    await new ProductService(db).seedSamplesOnce(user.id);
  } catch (error) {
    console.error("[seed] Failed to seed sample products", error);
  }
}
