import { describe, expect, it } from "vitest";
import type { ProductListItem } from "#shared/types/product";
import { collectionJsonLd } from "./collectionJsonLd";

const collection = { title: "Gifts", seoTitle: "Gift ideas", seoDescription: "The best gifts", imageUrl: "https://example.com/cover.jpg" };

const product = (title: string, handle: string): ProductListItem => ({
  id: handle,
  title,
  handle,
  description: null,
  pricePence: null,
  retailer: null,
  affiliateUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  image: null,
  tags: [],
});

describe("collectionJsonLd", () => {
  it("describes the page and lists its products in order with absolute links", () => {
    expect(collectionJsonLd(collection, [product("Moon Lamp", "moon-lamp"), product("Skillet", "skillet")], "https://example.com")).toEqual({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Gift ideas",
      description: "The best gifts",
      image: "https://example.com/cover.jpg",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: 2,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Moon Lamp", url: "https://example.com/product/moon-lamp" },
          { "@type": "ListItem", position: 2, name: "Skillet", url: "https://example.com/product/skillet" },
        ],
      },
    });
  });

  it("leaves out the fields and list it doesn't have", () => {
    const jsonLd = collectionJsonLd({ title: "Gifts", seoTitle: "", seoDescription: null, imageUrl: null }, [], "https://example.com");

    expect(jsonLd).toEqual({ "@context": "https://schema.org", "@type": "CollectionPage", name: "Gifts" });
  });
});
