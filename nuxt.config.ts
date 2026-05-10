// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint"],
  devtools: { enabled: true },
  compatibilityDate: "2025-07-15",
  eslint: {
    config: {
      stylistic: {
        commaDangle: "always",
        braceStyle: "1tbs",
        quotes: "double",
        indent: 2,
        semi: true,
      },
    },
  },
});
