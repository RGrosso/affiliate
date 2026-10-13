import type { TagIcon } from "#shared/types/tag";

// `sparkle` is the single four-point star on purpose: `i-lucide-sparkles` reads as the generic "AI" icon.
export const tagIconNames: Record<TagIcon, string> = {
  star: "i-lucide-star",
  sparkle: "i-lucide-sparkle",
  flame: "i-lucide-flame",
  percent: "i-lucide-percent",
  tag: "i-lucide-tag",
  gift: "i-lucide-gift",
  heart: "i-lucide-heart",
  trophy: "i-lucide-trophy",
  zap: "i-lucide-zap",
  smile: "i-lucide-smile",
  leaf: "i-lucide-leaf",
};

export const tagIconLabels: Record<TagIcon, string> = {
  star: "Star",
  sparkle: "Sparkle",
  flame: "Flame",
  percent: "Percent",
  tag: "Tag",
  gift: "Gift",
  heart: "Heart",
  trophy: "Trophy",
  zap: "Lightning",
  smile: "Smile",
  leaf: "Leaf",
};
