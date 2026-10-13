import { ref } from "vue";
import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import TagPicker from "./TagPicker.vue";
import type { Tag } from "#shared/types/tag";

const tag = (name: string, icon: Tag["icon"] = null): Tag => ({
  id: name.toLowerCase(),
  name,
  slug: name.toLowerCase(),
  description: null,
  tooltip: null,
  icon,
  priority: null,
  showOnCards: true,
});

const tags = [
  tag("Bestseller", "trophy"),
  tag("Hot deal", "flame"),
  tag("Eco friendly", "leaf"),
  tag("Gift idea", "gift"),
  tag("Staff pick", "heart"),
  tag("Sale", "percent"),
  tag("Budget"),
];

const meta = {
  title: "Tag/Picker",
  component: TagPicker,
  args: { tags, modelValue: [] },
  // Keep the selection in local state so the picker can be tried out in Storybook
  render: args => ({
    components: { TagPicker },
    setup: () => ({ args, selected: ref(args.modelValue) }),
    template: "<div class=\"max-w-xs\"><TagPicker v-model=\"selected\" :tags=\"args.tags\" :creating=\"args.creating\" /></div>",
  }),
} satisfies Meta<typeof TagPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithSelected: Story = {
  args: { modelValue: ["bestseller", "eco friendly", "budget"] },
};

export const Creating: Story = {
  args: { modelValue: ["bestseller"], creating: true },
};

export const NoTags: Story = {
  args: { tags: [] },
};
