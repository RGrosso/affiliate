import { fileURLToPath } from "node:url";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "~": `${rootDir}app`,
            "~~": rootDir,
            "#shared": `${rootDir}shared`,
            "#server": `${rootDir}server`,
            "hub:db:schema": `${rootDir}server/db/schema.ts`,
          },
        },
        test: {
          name: "unit",
          include: ["{shared,server,app/utils}/**/*.test.ts", "test/unit/**/*.test.ts"],
          environment: "node",
          setupFiles: ["test/setup/unit.ts"],
        },
      },
      () =>
        defineVitestProject({
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
