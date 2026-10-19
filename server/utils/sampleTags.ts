import type { TagIcon } from "#shared/types/tag";
import { slugify } from "#shared/utils/slugify";

export type SampleTag = {
  name: string;
  slug: string;
  description: string;
  tooltip: string;
  icon: TagIcon;
  priority: number;
  showOnCards: boolean;
  showInFilter: boolean;
};

const sampleTag = (name: string, rest: Omit<SampleTag, "name" | "slug">): SampleTag => ({ name, slug: slugify(name), ...rest });

export const sampleTags: SampleTag[] = [
  sampleTag("Best seller", {
    description: "The products visitors pick most often.",
    tooltip: "One of our most popular picks",
    icon: "trophy",
    priority: 90,
    showOnCards: true,
    showInFilter: false,
  }),
  sampleTag("Under £20", {
    description: "Good presents that cost less than £20.",
    tooltip: "Costs less than £20",
    icon: "percent",
    priority: 80,
    showOnCards: true,
    showInFilter: false,
  }),
  sampleTag("Eco-friendly", {
    description: "Reusable, long-lasting or lower-waste products.",
    tooltip: "Made to last and cut waste",
    icon: "leaf",
    priority: 60,
    showOnCards: true,
    showInFilter: true,
  }),
  sampleTag("Gadgets", {
    description: "Clever bits of tech.",
    tooltip: "Clever tech",
    icon: "zap",
    priority: 40,
    showOnCards: false,
    showInFilter: true,
  }),
  sampleTag("Kitchen", {
    description: "For people who love to cook.",
    tooltip: "For the kitchen",
    icon: "flame",
    priority: 40,
    showOnCards: false,
    showInFilter: true,
  }),
  sampleTag("Outdoors", {
    description: "For camping, walking and days out.",
    tooltip: "For the great outdoors",
    icon: "star",
    priority: 40,
    showOnCards: false,
    showInFilter: true,
  }),
  sampleTag("For him", {
    description: "Gift ideas for him.",
    tooltip: "A gift idea for him",
    icon: "gift",
    priority: 30,
    showOnCards: false,
    showInFilter: true,
  }),
  sampleTag("For her", {
    description: "Gift ideas for her.",
    tooltip: "A gift idea for her",
    icon: "heart",
    priority: 30,
    showOnCards: false,
    showInFilter: true,
  }),
  sampleTag("For pets", {
    description: "Treats for cats, dogs and their owners.",
    tooltip: "A treat for your pet",
    icon: "smile",
    priority: 30,
    showOnCards: false,
    showInFilter: true,
  }),
  sampleTag("Home office", {
    description: "Make working from home more comfortable.",
    tooltip: "For working from home",
    icon: "sparkle",
    priority: 20,
    showOnCards: false,
    showInFilter: true,
  }),
];

/** The tags on each sample product, by product handle and tag slug. */
export const sampleProductTags: Record<string, string[]> = {
  "cast-iron-skillet-12": ["kitchen", "for-him", "best-seller"],
  "pour-over-coffee-kit": ["kitchen", "best-seller"],
  "chefs-knife-20cm": ["kitchen", "for-him"],
  "instant-read-thermometer": ["kitchen", "gadgets"],
  "glass-meal-prep-containers": ["kitchen", "eco-friendly"],
  "ultralight-backpacking-tent": ["outdoors", "for-him"],
  "insulated-water-bottle-1l": ["outdoors", "eco-friendly", "best-seller"],
  "packable-down-jacket": ["outdoors", "for-her"],
  "rechargeable-headlamp": ["outdoors", "gadgets"],
  "camping-hammock": ["outdoors", "for-her"],
  "noise-cancelling-headphones": ["gadgets", "for-him", "best-seller"],
  "mechanical-keyboard-75": ["gadgets", "home-office", "for-him"],
  "portable-power-bank-20000": ["gadgets"],
  "smart-plug-4-pack": ["gadgets", "eco-friendly"],
  "wireless-charging-stand": ["gadgets", "for-her"],
  "ergonomic-office-chair": ["home-office"],
  "standing-desk-frame": ["home-office"],
  "led-desk-lamp": ["home-office", "for-her"],
  "monitor-arm-single": ["home-office"],
  "linen-notebook-set": ["for-her", "eco-friendly"],
  "moon-lamp-15cm": ["gadgets", "for-her", "best-seller"],
  "radiator-cat-bed": ["for-pets", "under-20"],
  "dog-puzzle-feeder": ["for-pets", "under-20", "best-seller"],
  "desk-cactus-plush": ["under-20", "home-office"],
};
