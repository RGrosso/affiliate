import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import Alert from "./Alert.vue";

const meta = {
  title: "Core/Alert",
  component: Alert,
  argTypes: {
    variant: { control: "select", options: ["success", "info", "warning", "error"] },
  },
  args: {
    variant: "info",
    title: "Search is coming soon",
    description: "We're still building it, so check back soon.",
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
  args: { variant: "success", title: "Product saved", description: "Your changes are live." },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "This product has no affiliate link",
    description: "Visitors can't buy it until you add one.",
    actions: [{ label: "Add a link", color: "warning", variant: "solid" }],
  },
};

export const Error: Story = {
  args: { variant: "error", title: "Couldn't load this product", description: "Please try again." },
};

export const CustomIcon: Story = {
  args: { icon: "i-heroicons-gift", title: "New gift ideas every Friday" },
};
