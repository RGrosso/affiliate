const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };

/** Plain text from editor HTML, for previews and meta descriptions. Not a sanitiser. */
export function htmlToText(html: string | null | undefined) {
  return (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, entity => ENTITIES[entity]!)
    .replace(/\s+/g, " ")
    .trim();
}
