import { DOCUMENT_NODE, ELEMENT_NODE, TEXT_NODE, transformSync } from "ultrahtml";
import sanitize from "ultrahtml/transformers/sanitize";
import type { walkSync } from "ultrahtml";

type Node = Parameters<typeof walkSync>[0];

// What the product description editor can produce. Anything else is unwrapped, keeping its text
const RICH_TEXT_ELEMENTS = [
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
  "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "a",
];

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

// ultrahtml writes attribute values back out without escaping them, so a link is rebuilt with URL,
// which percent-encodes quotes. Anything URL can't parse, or with another protocol, is dropped.
function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href.trim());
    return SAFE_PROTOCOLS.has(url.protocol) && !url.href.includes("\"") ? url.href : undefined;
  } catch {
    return undefined;
  }
}

// Keeps only elements and text. Comments are dropped too: `<!-->` closes a comment early in browsers,
// so markup hidden inside one would come out live. The sanitize transformer's `allowAttributes` also
// leaves attributes on other tags alone, so every attribute is stripped here.
function keepElementsAndText(node: Node) {
  if (node.type !== DOCUMENT_NODE && node.type !== ELEMENT_NODE) return node;

  node.children = node.children.filter(child => child.type === ELEMENT_NODE || child.type === TEXT_NODE);
  for (const child of node.children) {
    if (child.type !== ELEMENT_NODE) continue;

    const href = child.name === "a" ? safeHref(child.attributes.href) : undefined;
    child.attributes = href ? { href, target: "_blank", rel: "nofollow noopener noreferrer" } : {};
    keepElementsAndText(child);
  }
  return node;
}

/** Strips editor HTML down to the formatting the editor supports, so it's safe to render with `v-html`. */
export function sanitiseRichText(html: string | null): string | null {
  if (!html) return html;

  return transformSync(html, [
    sanitize({
      unblockElements: RICH_TEXT_ELEMENTS,
      dropElements: ["script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "math", "form"],
    }),
    keepElementsAndText,
  ]);
}
