import { expect, test } from "@nuxt/test-utils/playwright";
import { ADMIN } from "./config";

test.describe("logging in and out", () => {
  test("sends logged-out visitors from the admin area to the login page", async ({ page, goto }) => {
    await goto("/admin/products", { waitUntil: "hydration" });

    await expect(page).toHaveURL(/\/login$/);
  });

  test("explains when the password is wrong", async ({ page, goto }) => {
    await goto("/login", { waitUntil: "hydration" });

    await page.getByLabel("Username").fill(ADMIN.username);
    await page.getByLabel("Password").fill("Not-the-password1!");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("That username and password don't match. Please try again.")).toBeVisible();
  });

  test("logs the admin in and back out", async ({ page, goto }) => {
    await goto("/login", { waitUntil: "hydration" });

    await page.getByLabel("Username").fill(ADMIN.username);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("button", { name: ADMIN.username }).first().click();
    await page.getByRole("menuitem", { name: "Logout" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  });
});
