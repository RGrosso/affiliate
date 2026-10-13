import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import Tag from "./Tag.vue";

const meta = {
  title: "Core/Tag",
  component: Tag,
  argTypes: {
    color: {
      control: "select",
      options: ["neutral", "primary", "secondary", "success", "info", "warning", "error"],
    },
  },
  args: { label: "Bestseller" },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Sample: Story = {
  args: { label: "Sample", color: "warning" },
};

export const AllColours: Story = {
  render: () => ({
    components: { Tag },
    setup: () => ({ colours: ["neutral", "primary", "secondary", "success", "info", "warning", "error"] as const }),
    template: "<div class=\"flex gap-2\"><Tag v-for=\"colour in colours\" :key=\"colour\" :label=\"colour\" :color=\"colour\" /></div>",
  }),
};
