import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import Pagination from "./Pagination.vue";

const meta = {
  title: "Core/Pagination",
  component: Pagination,
  args: { page: 1, total: 95, pageSize: 20 },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MiddlePage: Story = {
  args: { page: 3, total: 200 },
};

export const SinglePage: Story = {
  args: { total: 12 },
};
