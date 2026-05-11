// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui"],
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  compatibilityDate: "2025-07-15",
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
});
