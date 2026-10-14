import { describe, expect, it } from "vitest";
import { sanitiseRichText } from "./richText";

describe("sanitiseRichText", () => {
  it("keeps the formatting the editor produces", () => {
    const html = "<h2>Why</h2><p>It's <strong>great</strong> and <em>light</em>.</p><ul><li>One</li><li>Two</li></ul>";
    expect(sanitiseRichText(html)).toBe(html);
  });

  it("passes empty values through", () => {
    expect(sanitiseRichText(null)).toBeNull();
    expect(sanitiseRichText("")).toBe("");
  });

  it("drops scripts, styles and embeds with their content", () => {
    expect(sanitiseRichText("<p>Hi</p><script>alert(1)</script><style>p{}</style><iframe src=\"https://x.test\"></iframe>"))
      .toBe("<p>Hi</p>");
  });

  it("strips event handlers and other attributes", () => {
    expect(sanitiseRichText("<p onclick=\"alert(1)\" class=\"x\" style=\"color:red\">Hi</p>")).toBe("<p>Hi</p>");
    expect(sanitiseRichText("<p>A<img src=x onerror=\"alert(1)\">B</p>")).toBe("<p>AB</p>");
  });

  it("unwraps unknown elements but keeps their text", () => {
    expect(sanitiseRichText("<div><span>Kept</span></div>")).toBe("Kept");
  });

  it("opens safe links in a new tab and removes unsafe ones", () => {
    expect(sanitiseRichText("<a href=\"https://example.com\" onclick=\"x()\">Go</a>"))
      .toBe("<a href=\"https://example.com/\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">Go</a>");
    expect(sanitiseRichText("<a href=\"javascript:alert(1)\">Go</a>")).toBe("<a>Go</a>");
    expect(sanitiseRichText("<a href=\" jav&#x61;script:alert(1)\">Go</a>")).toBe("<a>Go</a>");
  });

  it("can't be tricked into adding attributes through a quote in a link", () => {
    // A quote in the host makes the URL invalid, so the link is dropped
    expect(sanitiseRichText("<a href='https://x.test\" onmouseover=\"alert(1)'>Go</a>")).toBe("<a>Go</a>");
    // A quote in the path is percent-encoded, so it can't close the attribute
    expect(sanitiseRichText("<a href='https://x.test/a\" onmouseover=\"alert(1)'>Go</a>"))
      .toBe("<a href=\"https://x.test/a%22%20onmouseover=%22alert(1)\" target=\"_blank\" rel=\"nofollow noopener noreferrer\">Go</a>");
  });

  it("drops comments, which can hide live markup from the parser", () => {
    expect(sanitiseRichText("<p>Hi</p><!--><img src=x onerror=alert(1)>-->")).not.toMatch(/onerror|<img|<!--/);
    expect(sanitiseRichText("<p>Hi</p><!-- note --><p>There</p>")).toBe("<p>Hi</p><p>There</p>");
  });
});
