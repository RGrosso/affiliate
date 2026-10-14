import { expect, test } from "@nuxt/test-utils/playwright";

// A seeded sample product, so these run before admin.spec deletes the samples
const PRODUCT = "/products/cast-iron-skillet-12";

test.describe("product page", () => {
  test("shows the product's details, tags and breadcrumbs", async ({ page, goto }) => {
    await goto(PRODUCT, { waitUntil: "hydration" });

    await expect(page).toHaveTitle(/^Cast Iron Skillet, 12-inch/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cast Iron Skillet, 12-inch");
    await expect(page.getByText("by Ironhearth")).toBeVisible();
    await expect(page.getByText("£34.99", { exact: true })).toBeVisible();
    await expect(page.getByText("Sample", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Description" })).toBeVisible();
    await expect(page.getByText("Oven safe to 260°C")).toBeVisible();

    const breadcrumbs = page.getByRole("navigation", { name: "breadcrumb" });
    await expect(breadcrumbs.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(breadcrumbs.getByRole("link", { name: "All products" })).toHaveAttribute("href", "/collections/all");
  });

  test("links out to the retailer as a sponsored link", async ({ page, goto }) => {
    await goto(PRODUCT, { waitUntil: "hydration" });

    const buy = page.getByRole("link", { name: "Buy at Kitchen Supply Co." });
    await expect(buy).toHaveAttribute("rel", "sponsored noopener noreferrer");
    await expect(buy).toHaveAttribute("target", "_blank");
  });

  test("switches the main image from the thumbnails", async ({ page, goto }) => {
    await goto(PRODUCT, { waitUntil: "hydration" });

    const gallery = page.getByRole("region", { name: "Images of Cast Iron Skillet, 12-inch" });
    const main = gallery.locator("[data-main]");
    const first = await main.getAttribute("src");

    await gallery.getByRole("button", { name: /^Show image 2 of/ }).click();

    await expect(main).not.toHaveAttribute("src", first!);
    await expect(gallery.getByRole("button", { name: /^Show image 2 of/ })).toHaveAttribute("aria-current", "true");
  });

  test("adds Product structured data for search engines", async ({ page, goto }) => {
    await goto(PRODUCT, { waitUntil: "hydration" });

    const jsonLd = JSON.parse(await page.locator("script[type='application/ld+json']").textContent() ?? "{}");
    expect(jsonLd).toMatchObject({
      "@type": "Product",
      "name": "Cast Iron Skillet, 12-inch",
      "brand": { name: "Ironhearth" },
      "offers": { price: "34.99", priceCurrency: "GBP" },
    });
  });

  test("returns a 404 for an unknown product", async ({ page }) => {
    const response = await page.goto("/products/no-such-product");

    expect(response?.status()).toBe(404);
  });

  test("has a placeholder for View all until collections exist", async ({ page, goto }) => {
    await goto("/collections/all", { waitUntil: "hydration" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("All products");
  });
});
