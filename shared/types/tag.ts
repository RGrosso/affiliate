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
  showInFilter: boolean;
};

/** Just what a badge needs, so public responses don't carry admin-only details. */
export type TagBadge = Pick<Tag, "id" | "name" | "slug" | "icon" | "tooltip">;

export type AdminTag = Tag & {
  /** The collections whose rules use this tag, which stop it being deleted. */
  collections: { id: string; title: string }[];
  productCount: number;
};
