import { expect, test } from "@nuxt/test-utils/playwright";
import { toasts } from "./helpers";

test.describe("homepage", () => {
  test("shows the hero and the sample products with prices", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/impossible to buy for/);
    await expect(page.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/products");

    const row = page.getByRole("list", { name: "Trending right now" });
    await expect(row.locator("h3")).toHaveCount(10);
    await expect(page.getByText(/^£[\d,]+(\.\d{2})?$/).first()).toBeVisible();
  });

  test("has a footer with the commission notice, but not on the login page", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("We may earn a commission, at no cost to you.");
    await expect(page.getByText("We may earn a commission, at no cost to you.")).toHaveCount(1);

    await goto("/login", { waitUntil: "hydration" });
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
  });

  test("loads more as the row scrolls, then ends with View all", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const row = page.getByRole("list", { name: "Trending right now" });
    await expect(row.locator("h3")).toHaveCount(10);

    // The row only loads more while it's on screen
    await row.scrollIntoViewIfNeeded();
    await row.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(row.locator("h3")).toHaveCount(20);

    // Keeps loading until every product is in, then ends with View all
    await expect(async () => {
      await row.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await expect(row.getByRole("link", { name: "View all" })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(row.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/collections/all");
    const { total } = (await (await page.request.get("/api/products?pageSize=1")).json()).data;
    await expect(row.locator("h3")).toHaveCount(total);
  });

  test("scrolls the row with the arrow buttons", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const row = page.getByRole("list", { name: "Trending right now" });
    const left = page.getByRole("button", { name: "Scroll Trending right now left" });
    const right = page.getByRole("button", { name: "Scroll Trending right now right" });
    await row.scrollIntoViewIfNeeded();
    await expect(left).toBeHidden();

    await right.click();
    await expect.poll(() => row.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await expect(left).toBeVisible();

    // Once everything has loaded and the row is at its end, there's nothing more to scroll to
    await expect(async () => {
      await row.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await expect(row.getByRole("link", { name: "View all" })).toBeVisible({ timeout: 1000 });
      await expect(right).toBeHidden({ timeout: 1000 });
    }).toPass();
  });

  test("links each card to its product page, not out to the retailer", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const row = page.getByRole("list", { name: "Trending right now" });
    await expect(row.locator("a[target=_blank]")).toHaveCount(0);

    const first = row.locator("h3 a").first();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/^\/product\/[a-z0-9-]+$/);

    await first.click();
    await expect(page).toHaveURL(href!);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("search says it's coming soon, without stacking toasts", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const search = page.getByRole("textbox", { name: "Search gifts" });
    await search.fill("socks");
    await search.press("Enter");
    await search.press("Enter");

    await expect(toasts(page)).toHaveCount(1);
    await expect(toasts(page)).toContainText("Search is coming soon");
  });
});
