import { expect, test } from "@nuxt/test-utils/playwright";
import { toasts } from "./helpers";

test.describe("homepage", () => {
  test("shows the hero and the sample products with prices", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/impossible to buy for/);
    await expect(page.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/products");

    const cards = page.locator("h3");
    await expect(cards).toHaveCount(8);
    await expect(page.getByText(/^£[\d,]+(\.\d{2})?$/).first()).toBeVisible();
    await expect(page.getByText("We may earn a commission, at no cost to you.")).toBeVisible();
  });

  test("links each product out to the retailer as a sponsored link", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const view = page.getByRole("link", { name: "View", exact: true }).first();
    await expect(view).toHaveAttribute("rel", "sponsored noopener noreferrer");
    await expect(view).toHaveAttribute("target", "_blank");
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
