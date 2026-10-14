export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/fonts", "@nuxt/ui", "@nuxthub/core", "nuxt-auth-utils", "@vueuse/nuxt"],
  $env: {
    // `nuxt dev --envName e2e`, used by the Playwright tests: a separate build and database,
    // so they can run alongside `pnpm dev` without touching its data
    e2e: {
      buildDir: ".nuxt-e2e",
      hub: { dir: ".data-e2e" },
    },
  },
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: "en-GB" },
    },
  },
  css: ["~/assets/css/main.css"],
  ui: {
    theme: {
      colors: ["primary", "secondary", "action", "success", "info", "warning", "error", "neutral"],
    },
  },
  compatibilityDate: "2025-07-15",
  nitro: {
    imports: {
      // Auto-imported in server code like server/utils
      dirs: ["server/repositories", "server/services"],
    },
  },
  hub: {
    db: "postgresql",
    blob: true,
  },
  typescript: {
    // Type-check the standalone Node scripts too (run with `node`, outside the app)
    nodeTsConfig: {
      include: ["../scripts/**/*"],
    },
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: "always-multiline",
        braceStyle: "1tbs",
        quotes: "double",
        indent: 2,
        semi: true,
      },
    },
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
    },
  },
});
