import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import TagProducts from "./TagProducts.vue";

const meta = {
  title: "Tag/Products",
  component: TagProducts,
  args: { slug: "bestseller", pageSize: 20, total: 0, products: [] },
} satisfies Meta<typeof TagProducts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithProducts: Story = {
  args: {
    total: 3,
    products: [
      { id: "p1", title: "Moon Lamp", retailer: "Amazon", image: null },
      { id: "p2", title: "Air Fryer", retailer: "Argos", image: null },
      { id: "p3", title: "Desk Plant", retailer: null, image: null },
    ],
  },
};

export const Paged: Story = {
  args: {
    total: 45,
    pageSize: 2,
    products: [
      { id: "p1", title: "Moon Lamp", retailer: "Amazon", image: null },
      { id: "p2", title: "Air Fryer", retailer: "Argos", image: null },
    ],
  },
};
