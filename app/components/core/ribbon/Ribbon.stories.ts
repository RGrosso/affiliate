import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import Ribbon from "./Ribbon.vue";

const meta = {
  title: "Core/Ribbon",
  component: Ribbon,
  args: { label: "Preview" },
  render: args => ({
    components: { Ribbon },
    setup: () => ({ args }),
    template: '<div class="relative h-48 bg-band"><Ribbon v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Ribbon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Flags a page or block as not live. The parent needs `relative`. */
export const Default: Story = {};
