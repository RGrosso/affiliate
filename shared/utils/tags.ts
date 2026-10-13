import type { Tag } from "../types/tag";

/** Highest priority first (no priority counts as 0), then by name. */
export function sortTagsByPriority<T extends Pick<Tag, "name" | "priority">>(tags: readonly T[]): T[] {
  return [...tags].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name, "en-GB"));
}
