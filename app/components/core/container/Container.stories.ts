import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import Container from "./Container.vue";

const meta = {
  title: "Core/Container",
  component: Container,
  parameters: { layout: "fullscreen" },
  argTypes: {
    variant: { control: "select", options: ["default", "padded", "full"] },
    as: { control: "select", options: ["div", "section", "main", "header", "footer", "article"] },
  },
  render: args => ({
    components: { Container },
    setup: () => ({ args }),
    template: `
      <Container v-bind="args" :class="args.variant === 'full' ? 'bg-band text-white py-8' : 'outline outline-dashed outline-accented'">
        <p class="text-inherit">Page-width content lines up with the rest of the page.</p>
      </Container>
    `,
  }),
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Padded: Story = {
  args: { variant: "padded" },
};

/** A full-width band, like the homepage hero: the background spans the page, the content doesn't. */
export const Full: Story = {
  args: { variant: "full", as: "section" },
};
