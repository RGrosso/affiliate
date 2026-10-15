import { fileURLToPath } from "node:url";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite-plus";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

const nodeAliases = {
  "~": `${rootDir}app`,
  "~~": rootDir,
  "#shared": `${rootDir}shared`,
  "#server": `${rootDir}server`,
  "hub:db:schema": `${rootDir}server/db/schema.ts`,
};

export default defineConfig({
  lint: {
    plugins: ["eslint", "typescript", "oxc", "vue", "import", "vitest"],
    categories: { correctness: "error" },
    rules: {
      // Rules carried over from the old ESLint setup (@nuxt/eslint) that sit outside Oxlint's correctness category
      "no-array-constructor": "error",
      "no-case-declarations": "error",
      "no-empty": "error",
      "no-fallthrough": "error",
      "no-prototype-builtins": "error",
      "no-regex-spaces": "error",
      "no-unexpected-multiline": "error",
      "no-useless-constructor": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "preserve-caught-error": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "typescript/ban-ts-comment": ["error", { minimumDescriptionLength: 10 }],
      "typescript/consistent-type-imports": "error",
      "typescript/no-dynamic-delete": "error",
      "typescript/no-empty-object-type": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-extraneous-class": "error",
      "typescript/no-import-type-side-effects": "error",
      "typescript/no-invalid-void-type": "error",
      "typescript/no-namespace": "error",
      "typescript/no-non-null-asserted-nullish-coalescing": "error",
      "typescript/no-require-imports": "error",
      "typescript/no-unnecessary-type-constraint": "error",
      "typescript/no-unsafe-function-type": "error",
      "typescript/prefer-literal-enum-member": "error",
      "typescript/unified-signatures": "error",
      "vue/component-definition-name-casing": "error",
      "vue/no-multiple-slot-args": "error",
      "vue/no-required-prop-with-default": "error",
      "vue/prop-name-casing": "error",
      "vue/require-prop-types": "error",
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-mutable-exports": "error",
      "import/no-named-default": "error",
      "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "expectAccessible"] }],
    },
    ignorePatterns: [
      ".output/**",
      ".data/**",
      ".data-e2e/**",
      ".nuxt/**",
      ".nuxt-e2e/**",
      ".nitro/**",
      ".cache/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "server/db/migrations/**",
      "storybook-static/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  fmt: {
    semi: true,
    singleQuote: false,
    printWidth: 160,
    trailingComma: "es5",
    arrowParens: "avoid",
    singleAttributePerLine: true,
    ignorePatterns: ["pnpm-lock.yaml", "patches/**", "server/db/migrations/**"],
  },
  staged: {
    "*.{js,ts,mjs,cjs,vue}": "vp lint --fix",
    "*.{js,ts,mjs,cjs,vue,json,yml,yaml,md,html,css}": "vp fmt",
  },
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
            include: ["vitest > expect-type", "vitest > magic-string", "vitest > chai", "@vue/test-utils", "@vue/devtools-kit", "axe-core", "zod"],
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
