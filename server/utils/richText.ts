import { ELEMENT_NODE, transformSync, walkSync } from "ultrahtml";
import sanitize from "ultrahtml/transformers/sanitize";

type Node = Parameters<typeof walkSync>[0];

// What the product description editor can produce. Anything else is unwrapped, keeping its text
const RICH_TEXT_ELEMENTS = [
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
  "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "a",
];

const SAFE_LINK = /^(?:https?:|mailto:)/i;

// The sanitize transformer's `allowAttributes` leaves attributes on other tags alone, so strip them here
function stripAttributes(doc: Node) {
  walkSync(doc, (node) => {
    if (node.type !== ELEMENT_NODE) return;

    const href = node.name === "a" ? node.attributes.href?.trim() : undefined;
    node.attributes = href && SAFE_LINK.test(href)
      ? { href, target: "_blank", rel: "nofollow noopener noreferrer" }
      : {};
  });
  return doc;
}

/** Strips editor HTML down to the formatting the editor supports, so it's safe to render with `v-html`. */
export function sanitiseRichText(html: string | null): string | null {
  if (!html) return html;

  return transformSync(html, [
    sanitize({
      unblockElements: RICH_TEXT_ELEMENTS,
      dropElements: ["script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "math", "form"],
    }),
    stripAttributes,
  ]);
}
