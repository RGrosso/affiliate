import { expect, test } from "@nuxt/test-utils/playwright";
import { toasts } from "./helpers";

// These build on each other: add a product, edit it, then clear out the samples
test.describe.configure({ mode: "serial" });

test.describe("managing products", () => {
  test("adds a product, entering the price in pounds", async ({ page, goto }) => {
    await goto("/admin/add-product", { waitUntil: "hydration" });

    await page.getByLabel("Title", { exact: true }).fill("E2E Moon Lamp");
    await page.getByLabel("Price", { exact: true }).fill("24.99");
    await page.getByLabel("Retailer", { exact: true }).fill("Gadget Hub");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole("link", { name: "E2E Moon Lamp" })).toBeVisible();
  });

  test("edits the product and shows it with the new price on the homepage", async ({ page, goto }) => {
    await goto("/admin/products", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "E2E Moon Lamp" }).click();

    await expect(page.getByLabel("Price", { exact: true })).toHaveValue("£24.99");
    await page.getByLabel("Price", { exact: true }).fill("30");
    // The number input only commits its value when it loses focus
    await page.getByLabel("Price", { exact: true }).press("Tab");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toasts(page)).toContainText("Product saved");

    await goto("/", { waitUntil: "hydration" });
    // Newest products come first, so the edited one is among the featured cards
    await expect(page.getByRole("heading", { name: "E2E Moon Lamp" })).toBeVisible();
    await expect(page.getByText("£30", { exact: true })).toBeVisible();
  });

  test("deletes all sample products and keeps the admin's own", async ({ page, goto }) => {
    await goto("/admin/products", { waitUntil: "hydration" });
    await expect(page.getByText("You're viewing sample products")).toBeVisible();

    await page.getByRole("button", { name: "Delete sample products" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete sample products" }).click();

    await expect(page.getByText("You're viewing sample products")).toBeHidden();
    await expect(page.getByText("Sample", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "E2E Moon Lamp" })).toBeVisible();
  });
});
