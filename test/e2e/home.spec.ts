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
    await expect(page.getByText("We may earn a commission, at no cost to you.")).toBeVisible();
  });

  test("loads a second page as the row scrolls, then ends with View all", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const row = page.getByRole("list", { name: "Trending right now" });
    await expect(row.locator("h3")).toHaveCount(10);

    // The row only loads more while it's on screen
    await row.scrollIntoViewIfNeeded();
    await row.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(row.locator("h3")).toHaveCount(20);

    await row.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(row.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/collections/all");
  });

  test("scrolls the row with the arrow buttons", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const row = page.getByRole("list", { name: "Trending right now" });
    const left = page.getByRole("button", { name: "Scroll Trending right now left" });
    await expect(left).toBeDisabled();

    await page.getByRole("button", { name: "Scroll Trending right now right" }).click();
    await expect.poll(() => row.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await expect(left).toBeEnabled();
  });

  test("links each card to its product page, not out to the retailer", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const row = page.getByRole("list", { name: "Trending right now" });
    await expect(row.locator("a[target=_blank]")).toHaveCount(0);

    const first = row.locator("h3 a").first();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/^\/products\/[a-z0-9-]+$/);

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
