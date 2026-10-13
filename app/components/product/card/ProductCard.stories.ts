import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import type { Tag } from "#shared/types/tag";
import ProductCard from "./ProductCard.vue";

function makeTag(name: string, overrides: Partial<Tag> = {}): Tag {
  return {
    id: name,
    name,
    slug: name.toLowerCase(),
    description: null,
    tooltip: null,
    icon: null,
    priority: 0,
    showOnCards: true,
    ...overrides,
  };
}

const newTag = makeTag("New", { icon: "sparkle", tooltip: "Added in the last fortnight", priority: 1000 });
const bestseller = makeTag("Bestseller", { icon: "trophy", tooltip: "One of our most popular products", priority: 50 });
const eco = makeTag("Eco", { icon: "leaf", tooltip: "Made from recycled materials", priority: 10 });
const gift = makeTag("Gift", { icon: "gift", priority: 5 });
const hidden = makeTag("Internal", { priority: 2000, showOnCards: false });

const product = {
  title: "Moon Lamp",
  retailer: "Gadget Hub",
  pricePence: 2499,
  affiliateUrl: "https://example.com/moon-lamp",
  image: null,
};

const meta = {
  title: "Product/ProductCard",
  component: ProductCard,
  args: { product },
  decorators: [() => ({ template: "<div class=\"max-w-64\"><story /></div>" })],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoTags: Story = {};

export const FewTags: Story = {
  args: { product: { ...product, tags: [bestseller, eco] } },
};

export const MoreThanThreeTags: Story = {
  args: { product: { ...product, tags: [gift, eco, hidden, newTag, bestseller] } },
};

export const Grid: Story = {
  decorators: [() => ({ template: "<div class=\"max-w-4xl\"><story /></div>" })],
  render: () => ({
    components: { ProductCard },
    setup: () => ({
      products: [
        { ...product, title: "Moon Lamp", tags: [newTag, bestseller, eco] },
        { ...product, title: "Desk Cactus", retailer: "Plant Place", pricePence: 1200, tags: [gift] },
        { ...product, title: "Pet Mug", pricePence: 899, tags: [gift, eco, hidden, newTag, bestseller] },
        { ...product, title: "Plain Notebook", pricePence: 450 },
      ],
    }),
    template: "<div class=\"grid grid-cols-2 lg:grid-cols-4 gap-5\"><ProductCard v-for=\"p in products\" :key=\"p.title\" :product=\"p\" /></div>",
  }),
};
