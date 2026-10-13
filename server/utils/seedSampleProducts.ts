import type { User } from "#auth-utils";

/** Seeds the sample products when an admin logs in. Never blocks the login if it fails. */
export async function seedSampleProductsForAdmin(user: User) {
  if (user.role !== "admin") return;

  try {
    await new ProductService(db).seedSamplesOnce(user.id);
  } catch (error) {
    console.error("[seed] Failed to seed sample products", error);
  }
}
