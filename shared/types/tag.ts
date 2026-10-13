/** Stored keys only: the app decides which icon each one shows (see `app/utils/tagIcons.ts`). */
export const tagIcons = ["star", "sparkle", "flame", "percent", "tag", "gift", "heart", "trophy", "zap", "smile", "leaf"] as const;

export type TagIcon = (typeof tagIcons)[number];

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tooltip: string | null;
  icon: TagIcon | null;
  /** Higher shows first. `null` counts as 0. */
  priority: number | null;
  showOnCards: boolean;
};

/** A tag in the admin list, with how many products use it. */
export type AdminTag = Tag & {
  productCount: number;
};
