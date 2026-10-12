import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import ButtonBar from "./ButtonBar.vue";

const meta = {
  title: "Core/ButtonBar",
  component: ButtonBar,
  args: { show: true },
  render: args => ({
    components: { ButtonBar },
    setup: () => ({ args }),
    template: `
      <ButtonBar v-bind="args">
        <UButton color="neutral" variant="outline" label="Discard" />
        <UButton label="Save" />
      </ButtonBar>
    `,
  }),
} satisfies Meta<typeof ButtonBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnsavedChanges: Story = {};

export const FailedUploads: Story = {
  args: { message: "Remove failed uploads before saving", icon: "i-heroicons-exclamation-triangle" },
};
