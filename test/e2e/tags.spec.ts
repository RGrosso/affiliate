import { expect, test } from "@nuxt/test-utils/playwright";
import { toasts } from "./helpers";

// These build on each other: tag a product, style the tag, then delete it
test.describe.configure({ mode: "serial" });

test.describe("managing tags", () => {
  let productId: string;

  test.beforeAll(async ({ playwright, baseURL }) => {
    // Own product, so this doesn't depend on data other specs create or delete
    const { ADMIN_STATE } = await import("./config");
    const request = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
    const response = await request.post("/api/products", { data: { title: "E2E Tag Lamp", price: 19.99 } });
    expect(response.ok()).toBe(true);
    productId = (await response.json()).data.id;
    await request.dispose();
  });

  test("adds a new tag from the product's tag picker", async ({ page, goto }) => {
    await goto(`/admin/products/${productId}`, { waitUntil: "hydration" });

    await page.getByRole("button", { name: "Tags", exact: true }).click();
    await page.getByPlaceholder("Search or add tags").fill("E2E New");
    await page.getByRole("option", { name: "Add \"E2E New\"" }).click();

    const chips = page.getByRole("list", { name: "Selected tags" });
    await expect(chips).toContainText("E2E New");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(toasts(page)).toContainText("Product saved");

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("list", { name: "Selected tags" })).toContainText("E2E New");
  });

  test("doesn't offer to add a tag that already exists", async ({ page, goto }) => {
    await goto(`/admin/products/${productId}`, { waitUntil: "hydration" });

    await page.getByRole("button", { name: "Tags", exact: true }).click();
    await page.getByPlaceholder("Search or add tags").fill("e2e new");

    await expect(page.getByRole("option", { name: /^Add / })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "E2E New" })).toBeVisible();
  });

  test("edits the tag on the Tags page", async ({ page, goto }) => {
    await goto("/admin", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "Tags", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/tags$/);

    const row = page.getByRole("row", { name: /E2E New/ });
    await expect(row).toBeVisible();
    await expect(row.getByRole("link", { name: "1", exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Edit E2E New" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Tooltip", { exact: true }).fill("Just landed");
    await dialog.getByRole("combobox", { name: "Icon" }).click();
    await page.getByRole("option", { name: "Star" }).click();
    const priority = dialog.getByLabel("Priority", { exact: true });
    await priority.fill("1000");
    // The number input only commits its value when it loses focus
    await priority.press("Tab");
    await dialog.getByRole("switch", { name: "Show on product cards" }).click();
    await dialog.getByRole("button", { name: "Save tag" }).click();

    await expect(toasts(page)).toContainText("Tag saved");
    await expect(row).toContainText("1000");
    await expect(row).toContainText("Yes");
  });

  test("shows the tag on the product's card on the homepage", async ({ page, goto }) => {
    await goto("/", { waitUntil: "hydration" });

    const card = page.locator("div", { has: page.getByRole("heading", { name: "E2E Tag Lamp" }) }).filter({ hasText: "E2E New" }).last();
    await expect(card.getByRole("heading", { name: "E2E Tag Lamp" })).toBeVisible();
    await expect(card.getByText("E2E New", { exact: true })).toBeVisible();
  });

  test("filters the admin product list by the tag", async ({ page, goto }) => {
    await goto("/admin/tags", { waitUntil: "hydration" });
    await page.getByRole("row", { name: /E2E New/ }).getByRole("link", { name: "1", exact: true }).click();

    await expect(page).toHaveURL(/\/admin\/products\?tag=e2e-new/);
    await expect(page.getByRole("link", { name: "E2E Tag Lamp" })).toBeVisible();
    await expect(page.getByRole("link", { name: "E2E Moon Lamp" })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /E2E Tag Lamp/ })).toHaveCount(1);
  });

  test("deletes the tag and removes it from the product", async ({ page, goto }) => {
    await goto("/admin/tags", { waitUntil: "hydration" });
    await page.getByRole("button", { name: "Delete E2E New" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete tag" }).click();

    await expect(toasts(page)).toContainText("Tag deleted");
    await expect(page.getByRole("row", { name: /E2E New/ })).toHaveCount(0);

    await goto(`/admin/products/${productId}`, { waitUntil: "hydration" });
    await expect(page.getByRole("heading", { name: "E2E Tag Lamp" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Selected tags" })).toHaveCount(0);
    await expect(page.getByText("E2E New")).toHaveCount(0);
  });
});
