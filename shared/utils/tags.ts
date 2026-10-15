import type { Tag, TagBadge } from "../types/tag";
import { LOCALE } from "./format";

export const MAX_CARD_TAGS = 3;

/** Highest priority first (no priority counts as 0), then by name. */
export function sortTagsByPriority<T extends Pick<Tag, "name" | "priority">>(tags: readonly T[]): T[] {
  return [...tags].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name, LOCALE));
}

export const toTagBadge = ({ id, name, slug, icon, tooltip }: Tag): TagBadge => ({ id, name, slug, icon, tooltip });

/** The tags a product card shows: only those marked to show on cards, highest priority first. */
export const pickCardTags = (tags: readonly Tag[]): TagBadge[] =>
  sortTagsByPriority(tags.filter(tag => tag.showOnCards))
    .slice(0, MAX_CARD_TAGS)
    .map(toTagBadge);
