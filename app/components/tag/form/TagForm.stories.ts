import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import TagForm from "./TagForm.vue";

const meta = {
  title: "Tag/Form",
  component: TagForm,
  args: {
    tag: {
      id: "tag-1",
      name: "Bestseller",
      slug: "bestseller",
      description: null,
      tooltip: null,
      icon: null,
      priority: null,
      showOnCards: false,
    },
  },
} satisfies Meta<typeof TagForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const Filled: Story = {
  args: {
    tag: {
      id: "tag-2",
      name: "Hot deal",
      slug: "hot-deal",
      description: "Products with a limited-time discount.",
      tooltip: "Price drops are only here for a short while",
      icon: "flame",
      priority: 10,
      showOnCards: true,
    },
  },
};
