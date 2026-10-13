import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import Tag from "./Tag.vue";
import { tagIcons } from "#shared/types/tag";
import { tagIconLabels } from "~/utils/tagIcons";

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

export const WithIcon: Story = {
  args: { label: "Hot deal", icon: "flame", color: "error" },
};

export const WithTooltip: Story = {
  args: { label: "Bestseller", icon: "trophy", tooltip: "One of our most popular products this month" },
};

export const AllIcons: Story = {
  render: () => ({
    components: { Tag },
    setup: () => ({ icons: tagIcons, labels: tagIconLabels }),
    template: "<div class=\"flex flex-wrap gap-2\"><Tag v-for=\"icon in icons\" :key=\"icon\" :label=\"labels[icon]\" :icon=\"icon\" /></div>",
  }),
};
