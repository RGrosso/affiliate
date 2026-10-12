import type { StorybookConfig } from "@storybook-vue/nuxt";

const config: StorybookConfig = {
  stories: ["../app/components/**/*.stories.ts"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes"],
  framework: "@storybook-vue/nuxt",
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  viteFinal(viteConfig) {
    viteConfig.plugins ??= [];
    // @storybook-vue/nuxt 10.0.1 registers the story's Nuxt app with unctx, but Nuxt 4.6 keeps
    // its app context in its own registry, so every useNuxtApp() call failed with NUXT_E1001.
    // Point the framework at Nuxt's getNuxtAppCtx instead. Remove once the framework does this itself.
    viteConfig.plugins.unshift({
      name: "storybook-nuxt-app-context",
      enforce: "pre",
      transform(code, id) {
        if (!id.replaceAll("\\", "/").includes("@storybook-vue/nuxt/dist/preview")) return;
        return code
          .replace("import { getContext } from 'unctx';", "import { getNuxtAppCtx } from '#app/nuxt';")
          .replaceAll("getContext(", "getNuxtAppCtx(");
      },
    });
    return viteConfig;
  },
};

export default config;
