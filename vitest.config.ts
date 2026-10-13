import { fileURLToPath } from "node:url";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

const nodeAliases = {
  "~": `${rootDir}app`,
  "~~": rootDir,
  "#shared": `${rootDir}shared`,
  "#server": `${rootDir}server`,
  "hub:db:schema": `${rootDir}server/db/schema.ts`,
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: nodeAliases },
        test: {
          name: "unit",
          include: ["{shared,app/utils}/**/*.test.ts", "test/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      // Server code gets Nitro's auto-imports as globals; kept separate so shared/ and app/ tests can't lean on them
      {
        resolve: { alias: nodeAliases },
        test: {
          name: "unit-server",
          include: ["server/**/*.test.ts"],
          environment: "node",
          setupFiles: ["test/setup/server.ts"],
        },
      },
      () =>
        defineVitestProject({
          // Pre-bundle what the tests import. Otherwise Vite finds these mid-run on a cold cache (as in CI),
          // re-optimises and reloads, and every test file fails to import.
          optimizeDeps: {
            include: [
              "vitest > expect-type",
              "vitest > magic-string",
              "vitest > chai",
              "@vue/test-utils",
              "@vue/devtools-kit",
              "axe-core",
              "zod",
            ],
          },
          test: {
            name: "nuxt",
            include: ["app/{components,composables}/**/*.test.ts", "test/nuxt/**/*.test.ts"],
            environment: "nuxt",
            environmentOptions: {
              nuxt: { rootDir },
            },
            browser: {
              enabled: true,
              provider: playwright(),
              // The first run builds Nuxt for the browser, which can take longer than the 60s default
              connectTimeout: 180_000,
              instances: [{ browser: "chromium", headless: true }],
            },
          },
        }),
    ],
    coverage: {
      provider: "v8",
      include: ["{app,server,shared}/**/*.{ts,vue}"],
      exclude: ["**/*.test.ts", "**/*.stories.ts"],
    },
  },
});
