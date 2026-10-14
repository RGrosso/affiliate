import { ref } from "vue";
import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import UButton from "@nuxt/ui/components/Button.vue";
import ButtonBar from "./ButtonBar.vue";

const meta = {
  title: "Core/ButtonBar",
  component: ButtonBar,
  args: { show: true },
  render: args => ({
    // Story templates aren't .vue files, so Nuxt's auto-imports don't apply, and Storybook's Vite
    // can't resolve #components: import what they use from Nuxt UI directly
    components: { ButtonBar, UButton },
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

export const SlidesUpWhenToggled: Story = {
  args: { show: false },
  render: args => ({
    components: { ButtonBar, UButton },
    setup: () => ({ args, shown: ref(false) }),
    template: `
      <div class="min-h-80">
        <UButton :label="shown ? 'Hide the bar' : 'Show the bar'" @click="shown = !shown" />
        <ButtonBar v-bind="args" :show="shown">
          <UButton color="neutral" variant="outline" label="Discard" />
          <UButton label="Save" />
        </ButtonBar>
      </div>
    `,
  }),
};

export const FailedUploads: Story = {
  args: { message: "Remove failed uploads before saving", icon: "i-heroicons-exclamation-triangle" },
};
