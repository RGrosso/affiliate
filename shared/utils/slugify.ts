export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    // Trim after cutting to length, so the cut can't leave a trailing hyphen
    .slice(0, 100)
    .replace(/^-+|-+$/g, "");
}
