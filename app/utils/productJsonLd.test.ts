import { describe, expect, it } from "vitest";
import type { ProductDetail } from "#shared/types/product";
import { productJsonLd } from "./productJsonLd";

const product: ProductDetail = {
  id: "p1",
  title: "Moon Lamp",
  handle: "moon-lamp",
  description: "<p>A lamp &amp; a moon.</p>",
  brand: "Luna",
  pricePence: 2499,
  retailer: "Lamp Shop",
  affiliateUrl: "https://example.com/moon-lamp",
  isSample: false,
  seoTitle: null,
  seoDescription: null,
  images: [{ url: "https://example.com/a.jpg", alt: null }],
  tags: [],
};

describe("productJsonLd", () => {
  it("describes the product, its brand and its offer in pounds", () => {
    expect(productJsonLd(product)).toEqual({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Moon Lamp",
      description: "A lamp & a moon.",
      image: ["https://example.com/a.jpg"],
      brand: { "@type": "Brand", name: "Luna" },
      offers: {
        "@type": "Offer",
        price: "24.99",
        priceCurrency: "GBP",
        url: "https://example.com/moon-lamp",
        seller: { "@type": "Organization", name: "Lamp Shop" },
      },
    });
  });

  it("prefers the SEO description", () => {
    expect(productJsonLd({ ...product, seoDescription: "Best lamp" }).description).toBe("Best lamp");
  });

  it("leaves out what the product doesn't have", () => {
    const bare = productJsonLd({
      ...product,
      description: null,
      brand: null,
      pricePence: null,
      images: [],
    });

    expect(bare).toEqual({ "@context": "https://schema.org", "@type": "Product", name: "Moon Lamp" });
  });
});
