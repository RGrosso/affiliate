import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import { ref } from "vue";
import TagIconSelect from "./TagIconSelect.vue";
import type { TagIcon } from "#shared/types/tag";

const meta = {
  title: "Tag/IconSelect",
  component: TagIconSelect,
  render: args => ({
    components: { TagIconSelect },
    setup() {
      const icon = ref<TagIcon | null>(args.modelValue ?? null);
      return { icon };
    },
    template: "<div class=\"w-64\"><TagIconSelect v-model=\"icon\" /></div>",
  }),
} satisfies Meta<typeof TagIconSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoIcon: Story = {};

export const WithIcon: Story = {
  args: { modelValue: "trophy" },
};
