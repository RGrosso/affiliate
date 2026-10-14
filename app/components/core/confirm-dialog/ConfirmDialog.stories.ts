import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import ConfirmDialog from "./ConfirmDialog.vue";

const meta = {
  title: "Core/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    open: true,
    title: "Leave without saving?",
    description: "You have unsaved changes. If you leave this page, they'll be lost.",
    question: "Are you sure you want to leave?",
    confirmLabel: "Yes, leave",
    cancelLabel: "Cancel",
    color: "error",
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {};

export const Default: Story = {
  args: {
    title: "Publish this product?",
    description: undefined,
    confirmLabel: "Publish",
    cancelLabel: "Cancel",
    color: "primary",
  },
};
