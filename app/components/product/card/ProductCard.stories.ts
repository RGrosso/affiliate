import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import type { Tag } from "#shared/types/tag";
import { pickCardTags } from "#shared/utils/tags";
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
    showInFilter: false,
    ...overrides,
  };
}

const newTag = makeTag("New", { icon: "sparkle", tooltip: "Added in the last fortnight", priority: 1000 });
const bestseller = makeTag("Bestseller", { icon: "trophy", tooltip: "One of our most popular products", priority: 50 });
const eco = makeTag("Eco", { icon: "leaf", tooltip: "Made from recycled materials", priority: 10 });
const gift = makeTag("Gift", { icon: "gift", priority: 5 });
const hidden = makeTag("Internal", { priority: 2000, showOnCards: false });

const mixedTags = [gift, eco, hidden, newTag, bestseller];

const product = {
  title: "Moon Lamp",
  handle: "moon-lamp",
  pricePence: 2499,
  image: null,
};

const meta = {
  title: "Product/ProductCard",
  component: ProductCard,
  args: { product },
  decorators: [() => ({ template: '<div class="max-w-64"><story /></div>' })],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoTags: Story = {};

export const FewTags: Story = {
  args: { product: { ...product, tags: pickCardTags([bestseller, eco]) } },
};

// The server picks card tags with `pickCardTags`: on-card only, top three by priority
export const MoreThanThreeTags: Story = {
  args: { product: { ...product, tags: pickCardTags(mixedTags) } },
};

export const Grid: Story = {
  decorators: [() => ({ template: '<div class="max-w-4xl"><story /></div>' })],
  render: () => ({
    components: { ProductCard },
    setup: () => ({
      products: [
        { ...product, title: "Moon Lamp", tags: pickCardTags([newTag, bestseller, eco]) },
        { ...product, title: "Desk Cactus", pricePence: 1200, tags: pickCardTags([gift]) },
        { ...product, title: "Pet Mug", pricePence: 899, tags: pickCardTags(mixedTags) },
        { ...product, title: "Plain Notebook", pricePence: 450 },
      ],
    }),
    template: '<div class="grid grid-cols-2 lg:grid-cols-4 gap-5"><ProductCard v-for="p in products" :key="p.title" :product="p" /></div>',
  }),
};
