import { expect, test } from "@nuxt/test-utils/playwright";
import { ADMIN, ADMIN_STATE } from "./config";

test("first-run setup creates the admin's password and logs them in", async ({ page, goto }) => {
  await goto("/login", { waitUntil: "hydration" });

  // The seeded admin has no password yet, so the app sends them to /setup
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByLabel("Username").fill(ADMIN.username);
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Password", { exact: true }).fill(ADMIN.password);
  await page.getByLabel("Confirm password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Save password" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE });
});
