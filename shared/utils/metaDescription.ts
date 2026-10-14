import { htmlToText } from "./htmlToText";

// Roughly what search engines show before cutting a description off
export const META_DESCRIPTION_LENGTH = 160;

/** The SEO description, falling back to the start of the description as plain text. */
export function metaDescription(seoDescription: string | null | undefined, descriptionHtml: string | null | undefined) {
  return seoDescription || htmlToText(descriptionHtml).slice(0, META_DESCRIPTION_LENGTH);
}
