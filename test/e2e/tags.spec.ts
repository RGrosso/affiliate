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

  test("edits the tag on its own page", async ({ page, goto }) => {
    await goto("/admin", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "Tags", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/tags$/);

    const row = page.getByRole("row", { name: /E2E New/ });
    await expect(row).toBeVisible();
    await expect(row.getByRole("link", { name: "1", exact: true })).toBeVisible();

    await row.getByRole("link", { name: "Edit E2E New" }).click();
    await expect(page).toHaveURL(/\/admin\/tags\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "E2E New", level: 1 })).toBeVisible();
    await expect(page.getByRole("list", { name: "Products with this tag" })).toContainText("E2E Tag Lamp");

    await page.getByLabel("Tooltip", { exact: true }).fill("Just landed");
    await page.getByRole("combobox", { name: "Icon" }).click();
    await page.getByRole("option", { name: "Star" }).click();
    const priority = page.getByLabel("Priority", { exact: true });
    await priority.fill("1000");
    // The number input only commits its value when it loses focus
    await priority.press("Tab");
    await page.getByRole("switch", { name: "Show on product cards" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(toasts(page)).toContainText("Tag saved");
    await expect(page.getByText("Unsaved changes")).toHaveCount(0);

    await page.getByRole("link", { name: "Tags", exact: true }).first().click();
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
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("This removes the tag from 1 product");
    await dialog.getByRole("button", { name: "Delete tag" }).click();

    await expect(toasts(page)).toContainText("Tag deleted");
    await expect(page.getByRole("row", { name: /E2E New/ })).toHaveCount(0);

    await goto(`/admin/products/${productId}`, { waitUntil: "hydration" });
    await expect(page.getByRole("heading", { name: "E2E Tag Lamp" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Selected tags" })).toHaveCount(0);
    await expect(page.getByText("E2E New")).toHaveCount(0);
  });
});

test.describe("tag product counts", () => {
  let productId: string;

  test.beforeAll(async ({ playwright, baseURL }) => {
    const { ADMIN_STATE } = await import("./config");
    const request = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
    const product = await request.post("/api/products", { data: { title: "E2E Count Lamp" } });
    expect(product.ok()).toBe(true);
    productId = (await product.json()).data.id;
    expect((await request.post("/api/tags", { data: { name: "E2E Count" } })).ok()).toBe(true);
    await request.dispose();
  });

  // The Tags page is visited first, so the app already holds its list when the product changes
  test("updates when tags are added to and removed from a product", async ({ page, goto }) => {
    const countLink = () => page.getByRole("row", { name: /E2E Count/ }).getByRole("link", { name: /^\d+$/ });
    const openTagsPage = async () => {
      await page.getByRole("link", { name: "Tags", exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/tags$/);
    };
    const openProduct = async () => {
      await page.getByRole("link", { name: "Products", exact: true }).click();
      await page.getByRole("link", { name: "E2E Count Lamp" }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}$`));
    };

    await goto("/admin/tags", { waitUntil: "hydration" });
    await expect(countLink()).toHaveText("0");

    await openProduct();
    await page.getByRole("button", { name: "Tags", exact: true }).click();
    await page.getByPlaceholder("Search or add tags").fill("E2E Count");
    await page.getByRole("option", { name: "E2E Count", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toasts(page)).toContainText("Product saved");

    await openTagsPage();
    await expect(countLink()).toHaveText("1");

    await openProduct();
    await page.getByRole("button", { name: "Remove E2E Count" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(toasts(page).last()).toContainText("Product saved");

    await openTagsPage();
    await expect(countLink()).toHaveText("0");
  });
});

test.describe("adding tags", () => {
  test.describe.configure({ mode: "serial" });

  let productId: string;

  test.beforeAll(async ({ playwright, baseURL }) => {
    const { ADMIN_STATE } = await import("./config");
    const request = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
    const response = await request.post("/api/products", { data: { title: "E2E Added Lamp" } });
    expect(response.ok()).toBe(true);
    productId = (await response.json()).data.id;
    await request.dispose();
  });

  test("adds a tag from the Tags page", async ({ page, goto }) => {
    await goto("/admin/tags", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "Add tag" }).click();
    await expect(page).toHaveURL(/\/admin\/tags\/new$/);
    await expect(page.getByRole("heading", { name: "Add tag", level: 1 })).toBeVisible();

    await page.getByLabel("Name", { exact: true }).fill("E2E Added");
    await page.getByLabel("Description", { exact: true }).fill("Added from the Tags page");
    await page.getByLabel("Tooltip", { exact: true }).fill("Fresh");
    await page.getByRole("combobox", { name: "Icon" }).click();
    await page.getByRole("option", { name: "Gift" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(toasts(page)).toContainText("Tag added");
    await expect(page).toHaveURL(/\/admin\/tags\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "E2E Added", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Tooltip", { exact: true })).toHaveValue("Fresh");
    await expect(page.getByText("No products have this tag yet. Add it from a product's Tags card.")).toBeVisible();
  });

  test("lists the products once the tag is added to one", async ({ page, goto }) => {
    await goto(`/admin/products/${productId}`, { waitUntil: "hydration" });
    await page.getByRole("button", { name: "Tags", exact: true }).click();
    await page.getByPlaceholder("Search or add tags").fill("E2E Added");
    await page.getByRole("option", { name: "E2E Added", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toasts(page)).toContainText("Product saved");

    await page.getByRole("link", { name: "Tags", exact: true }).click();
    await page.getByRole("link", { name: "Edit E2E Added" }).click();

    const products = page.getByRole("list", { name: "Products with this tag" });
    await expect(products.getByRole("link", { name: "E2E Added Lamp" })).toHaveAttribute("href", `/admin/products/${productId}`);
    await expect(page.getByRole("link", { name: "View in products list" })).toHaveAttribute("href", "/admin/products?tag=e2e-added");
  });

  test("asks before leaving a new tag with unsaved changes", async ({ page, goto }) => {
    await goto("/admin/tags/new", { waitUntil: "hydration" });
    await page.getByLabel("Name", { exact: true }).fill("E2E Unsaved");
    await expect(page.getByText("Unsaved tag")).toBeVisible();

    await page.getByRole("link", { name: "Tags", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/tags\/new$/);
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("E2E Unsaved");

    await page.getByRole("link", { name: "Tags", exact: true }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Yes, leave" }).click();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await expect(page.getByRole("row", { name: /E2E Unsaved/ })).toHaveCount(0);
  });

  test("deletes the tag from its own page", async ({ page, goto }) => {
    await goto("/admin/tags", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "Edit E2E Added" }).click();

    await page.getByRole("button", { name: "Delete tag" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete \"E2E Added\"?" });
    await expect(dialog).toContainText("This removes the tag from 1 product");
    await dialog.getByRole("button", { name: "Delete tag" }).click();

    await expect(toasts(page)).toContainText("Tag deleted");
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await expect(page.getByRole("row", { name: /E2E Added/ })).toHaveCount(0);
  });

  test("shows a friendly message for a tag that doesn't exist", async ({ page, goto }) => {
    await goto("/admin/tags/00000000-0000-4000-8000-000000000000", { waitUntil: "hydration" });

    await expect(page.getByText("We couldn't find that tag")).toBeVisible();
  });
});
