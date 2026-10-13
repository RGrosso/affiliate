import type { StorybookConfig } from "@storybook-vue/nuxt";

const config: StorybookConfig = {
  stories: ["../app/components/**/*.stories.ts"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes"],
  framework: {
    name: "@storybook-vue/nuxt",
    // vue-docgen-api is deprecated. Storybook 11's server-side docgen doesn't run under this framework,
    // so read props with vue-component-meta, which uses the same type information as vue-tsc.
    // Nuxt 4's root tsconfig only holds references, so point it at the app's generated one
    options: { docgen: { plugin: "vue-component-meta", tsconfig: ".nuxt/tsconfig.app.json" } },
  },
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
};

export default config;
