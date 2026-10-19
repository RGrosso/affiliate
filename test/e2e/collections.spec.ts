import { expect, test } from "@nuxt/test-utils/playwright";
import type { Page } from "@playwright/test";
import { ADMIN_STATE } from "./config";

const FILTER_TAG = "E2E Collection Filter";
const FILTER_TAG_SLUG = "e2e-collection-filter";
const TAGGED_TITLES = ["E2E Collection Tagged A", "E2E Collection Tagged B"];

// Titles of the product cards currently on the page
const cardTitles = (page: Page) => page.getByRole("list", { name: "Products" }).locator("h3").allInnerTexts();

const productCount = (page: Page) => page.getByText(/^\d+ products?$/);

async function apiTitles(page: Page, query: string) {
  const response = await page.request.get(`/api/collections/handle/all/products?${query}`);
  expect(response.ok()).toBe(true);
  return ((await response.json()).data.items as { title: string }[]).map(item => item.title);
}

test.describe("collection page", () => {
  test.beforeAll(async ({ playwright, baseURL }) => {
    const admin = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });

    const tag = await admin.post("/api/tags", { data: { name: FILTER_TAG, showInFilter: true } });
    expect(tag.ok()).toBe(true);
    const tagIds = [(await tag.json()).data.id];

    // The samples fill one page of 24 exactly, so add a few more to give Load more something to load
    for (const title of [...TAGGED_TITLES, "E2E Collection Extra A", "E2E Collection Extra B"]) {
      const response = await admin.post("/api/products", { data: { title, price: 12.5, ...(TAGGED_TITLES.includes(title) && { tagIds }) } });
      expect(response.ok(), title).toBe(true);
    }

    await admin.dispose();
  });

  test("shows the hero and the products of the all collection", async ({ page, goto }) => {
    await goto("/collections/all", { waitUntil: "hydration" });

    await expect(page).toHaveTitle(/^All products/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("All products");
    await expect(page.getByRole("list", { name: "Products" }).locator("h3").first()).toBeVisible();
    await expect(productCount(page)).toBeVisible();
    await expect(page.getByText("Preview", { exact: true })).toHaveCount(0);
    await expect(page.locator("meta[name=robots]")).toHaveCount(0);
  });

  test("adds CollectionPage structured data listing the products", async ({ page, goto }) => {
    await goto("/collections/all", { waitUntil: "hydration" });

    const jsonLd = JSON.parse((await page.locator("script[type='application/ld+json']").textContent()) ?? "{}");
    expect(jsonLd).toMatchObject({ "@type": "CollectionPage", name: "All products", mainEntity: { "@type": "ItemList" } });
    expect(jsonLd.mainEntity.itemListElement.length).toBeGreaterThan(0);
  });

  test("sorts the products and keeps the sort in the URL", async ({ page, goto }) => {
    await goto("/collections/all", { waitUntil: "hydration" });
    const newest = await cardTitles(page);

    await page.getByRole("combobox", { name: "Sort by" }).click();
    await expect(page.getByRole("option", { name: "Featured" })).toHaveCount(0);
    await page.getByRole("option", { name: "Price: low to high" }).click();

    await expect(page).toHaveURL(/\?sort=price-asc$/);
    const expected = await apiTitles(page, "sort=price-asc&pageSize=24");
    await expect.poll(() => cardTitles(page)).toEqual(expected);
    expect(expected).not.toEqual(newest);

    // Back to the default drops the parameter, and the history works
    await page.goBack();
    await expect(page).toHaveURL(/\/collections\/all$/);
    await expect.poll(() => cardTitles(page)).toEqual(newest);
  });

  test("opens with the sort from a shared link", async ({ page, goto }) => {
    await goto("/collections/all?sort=title-desc", { waitUntil: "hydration" });

    await expect(page.getByRole("combobox", { name: "Sort by" })).toContainText("Z–A");
    expect(await cardTitles(page)).toEqual(await apiTitles(page, "sort=title-desc&pageSize=24"));
  });

  test("narrows the list with the tag filter", async ({ page, goto }) => {
    await goto("/collections/all", { waitUntil: "hydration" });
    const all = await cardTitles(page);

    await page.getByRole("combobox", { name: "Filter by tag" }).click();
    await page.getByRole("option", { name: FILTER_TAG }).click();

    await expect(page).toHaveURL(new RegExp(`\\?tag=${FILTER_TAG_SLUG}$`));
    await expect(productCount(page)).toHaveText("2 products");
    await expect.poll(async () => (await cardTitles(page)).sort()).toEqual([...TAGGED_TITLES].sort());
    // The other filters stay available
    await expect(page.getByRole("combobox", { name: "Filter by tag" })).toContainText(FILTER_TAG);

    await page.getByRole("combobox", { name: "Filter by tag" }).click();
    await page.getByRole("option", { name: "All", exact: true }).click();
    await expect(page).toHaveURL(/\/collections\/all$/);
    await expect.poll(() => cardTitles(page)).toEqual(all);
  });

  test("combines a sort and a tag from the URL", async ({ page, goto }) => {
    await goto(`/collections/all?sort=price-desc&tag=${FILTER_TAG_SLUG}`, { waitUntil: "hydration" });

    await expect(productCount(page)).toHaveText("2 products");
    await expect(page.getByRole("combobox", { name: "Sort by" })).toContainText("Price: high to low");
    await expect(page.getByRole("combobox", { name: "Filter by tag" })).toContainText(FILTER_TAG);
  });

  test("says when no products match a tag", async ({ page, goto }) => {
    await goto("/collections/all?tag=no-such-tag", { waitUntil: "hydration" });

    await expect(page.getByText("No products match. Try another filter.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  });

  test("loads more products with the button", async ({ page, goto }) => {
    await goto("/collections/all", { waitUntil: "hydration" });

    const total = Number((await productCount(page).innerText()).split(" ")[0]);
    expect(total).toBeGreaterThan(24);
    // A whole number of rows at 2, 3 and 4 columns
    expect(await cardTitles(page)).toHaveLength(24);

    await page.getByRole("button", { name: "Load more" }).click();

    await expect.poll(async () => (await cardTitles(page)).length).toBe(total);
    expect(new Set(await cardTitles(page)).size).toBe(total);
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  });

  test("returns a 404 for an unknown collection", async ({ page }) => {
    const response = await page.goto("/collections/no-such-collection");

    expect(response?.status()).toBe(404);
  });

  test("redirects /products to the all collection", async ({ page, request }) => {
    const response = await request.get("/products", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe("/collections/all");

    await page.goto("/products");
    await expect(page).toHaveURL(/\/collections\/all$/);
  });

  test.describe("a draft collection", () => {
    let handle: string;
    let id: string;

    test.beforeAll(async ({ playwright, baseURL }) => {
      handle = `e2e-draft-${Date.now()}`;
      const admin = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
      const created = await admin.post("/api/collections", {
        data: { type: "manual", title: "E2E Draft Collection", handle, description: "Not live yet", status: "draft" },
      });
      expect(created.ok()).toBe(true);
      id = (await created.json()).data.id;
      await admin.dispose();
    });

    test.afterAll(async ({ playwright, baseURL }) => {
      const admin = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
      await admin.delete(`/api/collections/${id}`);
      await admin.dispose();
    });

    test("gives visitors a 404", async ({ page }) => {
      const response = await page.goto(`/collections/${handle}`);

      expect(response?.status()).toBe(404);
    });

    test.describe("as the admin", () => {
      test.use({ storageState: ADMIN_STATE });

      test("shows the page with a Preview ribbon and keeps it out of search engines", async ({ page, goto }) => {
        await goto(`/collections/${handle}`, { waitUntil: "hydration" });

        await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Draft Collection");
        await expect(page.getByText("Not live yet")).toBeVisible();
        await expect(page.getByText("Preview", { exact: true })).toBeVisible();
        await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", "noindex, nofollow");
        await expect(productCount(page)).toHaveText("0 products");
        await expect(page.getByText("New finds are on the way. Check back soon!")).toBeVisible();
      });
    });
  });
});
