import { expect, test } from "@nuxt/test-utils/playwright";
import { toasts } from "./helpers";

// These build on each other: create collections, edit the locked one, then delete what was made
test.describe.configure({ mode: "serial" });

test.describe("managing collections", () => {
  let tagId: string;

  test.beforeAll(async ({ playwright, baseURL }) => {
    const { ADMIN_STATE } = await import("./config");
    const request = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
    const tag = await request.post("/api/tags", { data: { name: "E2E Collection" } });
    expect(tag.ok()).toBe(true);
    tagId = (await tag.json()).data.id;
    const product = await request.post("/api/products", { data: { title: "E2E Collection Lamp", price: 12.5, tagIds: [tagId] } });
    expect(product.ok()).toBe(true);
    await request.dispose();
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    const { ADMIN_STATE } = await import("./config");
    const request = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
    // Whatever a failed test left behind, so the tag (which a collection's rules protect) can go too
    const list = (await (await request.get("/api/collections")).json()).data as { id: string; title: string; locked: boolean }[];
    for (const collection of list.filter(item => item.title.startsWith("E2E ") && !item.locked)) {
      await request.delete(`/api/collections/${collection.id}`);
    }
    await request.delete(`/api/tags/${tagId}`);
    await request.dispose();
  });

  test("lists the collections, with the locked all products collection", async ({ page, goto }) => {
    await goto("/admin", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "Collections", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/collections$/);

    const row = page.getByRole("row", { name: /All products/ });
    await expect(row).toContainText("Locked");
    await expect(row).toContainText("Automatic");
    await expect(row).toContainText("Live");
    await expect(row.getByRole("link", { name: "View All products on the site" })).toHaveAttribute("href", "/collections/all");
  });

  test("creates an automatic collection and previews the products that match", async ({ page, goto }) => {
    await goto("/admin/collections", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "Add collection" }).first().click();
    await expect(page).toHaveURL(/\/admin\/collections\/new$/);

    await page.getByRole("radio", { name: /Automatic/ }).click();
    await page.getByLabel("Title", { exact: true }).fill("E2E Tagged");
    await page.getByLabel("Description", { exact: true }).fill("Everything with the tag");

    await page.getByRole("button", { name: "Condition 1 tag" }).click();
    await page.getByRole("option", { name: "E2E Collection", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "match" })).toHaveText("1 product matches");
    await expect(page.getByRole("list", { name: "Matching products" })).toContainText("E2E Collection Lamp");
    await expect(page.getByText("Has the tag “E2E Collection”")).toBeVisible();

    // A second condition narrows it to nothing, and the count follows
    await page.getByRole("button", { name: "Add condition", exact: true }).click();
    await page.getByRole("combobox", { name: "Condition 2 type" }).click();
    await page.getByRole("option", { name: "Retailer" }).click();
    await page.getByRole("button", { name: "Condition 2 retailer" }).click();
    await page.getByPlaceholder("Search or type a retailer").fill("No Such Shop");
    await page.getByRole("option", { name: 'Use "No Such Shop"' }).click();
    await expect(page.getByRole("status").filter({ hasText: "match" })).toHaveText("0 products match");

    await page.getByRole("button", { name: "Remove condition 2" }).click();
    await expect(page.getByRole("status").filter({ hasText: "match" })).toHaveText("1 product matches");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toasts(page)).toContainText("Collection added");
    await expect(page).toHaveURL(/\/admin\/collections$/);
  });

  test("finds the new collection in the list and in the API", async ({ page, goto }) => {
    await goto("/admin/collections", { waitUntil: "hydration" });

    const row = page.getByRole("row", { name: /E2E Tagged/ });
    await expect(row).toContainText("Automatic");
    await expect(row).toContainText("Draft");
    await expect(row).toContainText("Has the tag “E2E Collection”");
    await expect(row.getByRole("link", { name: "View E2E Tagged on the site" })).toHaveAttribute("href", "/collections/e2e-tagged");

    // The public page may not exist yet, so check through the API (a draft is visible to the logged-in admin)
    const response = await page.request.get("/api/collections/handle/e2e-tagged/products");
    expect(response.status()).toBe(200);
    expect((await response.json()).data.items.map((item: { title: string }) => item.title)).toEqual(["E2E Collection Lamp"]);
  });

  test("creates a hand-picked collection by searching for products", async ({ page, goto }) => {
    await goto("/admin/collections/new", { waitUntil: "hydration" });

    await page.getByLabel("Title", { exact: true }).fill("E2E Picked");
    await page.getByRole("button", { name: "Add products" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Add products" });
    await dialog.getByLabel("Search products").fill("pour-over");
    const products = dialog.getByRole("list", { name: "Products" });
    await expect(products.getByRole("listitem")).toHaveCount(1);
    await products.getByRole("checkbox", { name: "Pour-Over Coffee Kit" }).click();
    await dialog.getByRole("button", { name: "Add 1 product" }).click();
    await expect(dialog).toHaveCount(0);

    const added = page.getByRole("list", { name: "Products in this collection" });
    await expect(added).toContainText("Pour-Over Coffee Kit");
    await expect(page.getByRole("heading", { name: "Products (1)" })).toBeVisible();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toasts(page)).toContainText("Collection added");
    await expect(page.getByRole("row", { name: /E2E Picked/ })).toContainText("Hand-picked");
  });

  test("shows the chosen products again when the collection is opened", async ({ page, goto }) => {
    await goto("/admin/collections", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "E2E Picked", exact: true }).click();

    await expect(page.getByRole("heading", { name: "E2E Picked", level: 1 })).toBeVisible();
    await expect(page.getByRole("list", { name: "Products in this collection" })).toContainText("Pour-Over Coffee Kit");
    await expect(page.getByText("Hand-picked. The type can't be changed")).toBeVisible();
  });

  test("uploads a cover image", async ({ page, goto }) => {
    await goto("/admin/collections", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "E2E Picked", exact: true }).click();

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    await page.locator("input[type=file]").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
    await expect(page.getByRole("button", { name: "Remove image" })).toBeVisible();
    await page.getByLabel("Alt text", { exact: true }).fill("A cover");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toasts(page)).toContainText("Collection saved");

    const list = (await (await page.request.get("/api/collections")).json()).data as { id: string; title: string }[];
    const id = list.find(item => item.title === "E2E Picked")!.id;
    const saved = (await (await page.request.get(`/api/collections/${id}`)).json()).data;
    expect(saved.imageUrl).toMatch(/^\/images\/collections\//);
    expect(saved.imageAlt).toBe("A cover");
  });

  test("rejects the reserved all handle with a message on the field", async ({ page, goto }) => {
    await goto("/admin/collections/new", { waitUntil: "hydration" });

    await page.getByLabel("Title", { exact: true }).fill("E2E Reserved");
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("URL handle").fill("all");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText("This URL is reserved for the all products page")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/collections\/new$/);
  });

  test("edits the title of the all products collection but not its handle", async ({ page, goto }) => {
    await goto("/admin/collections", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "All products", exact: true }).click();

    await expect(page.getByText("This collection is locked")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete collection" })).toHaveCount(0);
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByLabel("URL handle")).toBeDisabled();
    await expect(page.getByLabel("URL handle")).toHaveValue("all");

    const title = page.getByLabel("Title", { exact: true });
    await title.fill("Everything we sell");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toasts(page)).toContainText("Collection saved");
    await expect(page.getByLabel("URL handle")).toHaveValue("all");

    // Put it back, so other specs see the usual title
    await title.fill("All products");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(toasts(page).last()).toContainText("Collection saved");
  });

  test("deletes a collection through the confirm dialog", async ({ page, goto }) => {
    await goto("/admin/collections", { waitUntil: "hydration" });
    await page.getByRole("link", { name: "E2E Tagged", exact: true }).click();

    await page.getByRole("button", { name: "Delete collection" }).click();
    const dialog = page.getByRole("dialog", { name: 'Delete "E2E Tagged"?' });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole("button", { name: "Delete collection" }).click();
    await page.getByRole("dialog", { name: 'Delete "E2E Tagged"?' }).getByRole("button", { name: "Delete collection" }).click();

    await expect(toasts(page)).toContainText("Collection deleted");
    await expect(page).toHaveURL(/\/admin\/collections$/);
    await expect(page.getByRole("row", { name: /E2E Tagged/ })).toHaveCount(0);
    await expect(page.getByRole("row", { name: /E2E Picked/ })).toBeVisible();
  });
});
