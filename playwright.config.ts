import process from "node:process";
import type { ConfigOptions } from "@nuxt/test-utils/playwright";
import { defineConfig, devices } from "@playwright/test";
import { ADMIN_STATE, BASE_URL } from "./test/e2e/config";

export default defineConfig<ConfigOptions>({
  testDir: "./test/e2e",
  // The tests share one database and build on each other's data, so run them in order
  workers: 1,
  forbidOnly: !!process.env.CI,
  // No retries: the tests share one database, so a retry would run against data the first attempt changed
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"], ["html", { open: "on-failure" }]],
  timeout: 60_000,
  webServer: {
    command: "node test/e2e/serve.ts",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    nuxt: {
      rootDir: import.meta.dirname,
      host: BASE_URL,
    },
  },
  projects: [
    // First-run setup creates the admin and signs in once for the admin tests
    { name: "setup", testMatch: /setup\.ts$/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "public",
      testMatch: /(home|auth|api)\.spec\.ts$/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    // Runs last because it deletes the sample products the public tests rely on
    {
      name: "admin",
      testMatch: /admin\.spec\.ts$/,
      dependencies: ["public"],
      use: { ...devices["Desktop Chrome"], storageState: ADMIN_STATE },
    },
  ],
});
