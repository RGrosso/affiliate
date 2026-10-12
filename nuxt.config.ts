export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/fonts", "@nuxt/ui", "@nuxthub/core", "nuxt-auth-utils"],
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
  hub: {
    db: "postgresql",
    blob: true,
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
