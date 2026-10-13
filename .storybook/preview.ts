import type { Preview } from "@storybook-vue/nuxt";
import { withThemeByClassName } from "@storybook/addon-themes";
import UApp from "@nuxt/ui/components/App.vue";
import "~/assets/css/main.css";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    a11y: { test: "error" },
  },
  decorators: [
    // Nuxt UI parts such as tooltips and toasts need UApp's providers
    story => ({
      components: { UApp, story },
      template: "<UApp><div class=\"p-4\"><story /></div></UApp>",
    }),
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      parentSelector: "html",
    }),
  ],
};

export default preview;
