import { describe, expect, it } from "vitest";
import { htmlToText } from "./htmlToText";

describe("htmlToText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(htmlToText("<h2>Why</h2><p>It's  <strong>great</strong></p>\n<ul><li>One</li></ul>")).toBe("Why It's great One");
  });

  it("decodes the common entities", () => {
    expect(htmlToText("<p>Salt&nbsp;&amp; pepper &lt;3 &quot;yum&quot; &#39;ok&#39;</p>")).toBe("Salt & pepper <3 \"yum\" 'ok'");
  });

  it("returns an empty string for nothing", () => {
    expect(htmlToText(null)).toBe("");
    expect(htmlToText(undefined)).toBe("");
  });
});
