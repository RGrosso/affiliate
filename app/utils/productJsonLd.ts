import type { ProductDetail } from "#shared/types/product";
import { CURRENCY } from "#shared/utils/format";
import { htmlToText } from "#shared/utils/htmlToText";

/** schema.org Product structured data, so search engines can show the price and brand. Empty fields are left out. */
export function productJsonLd(product: ProductDetail) {
  const description = product.seoDescription || htmlToText(product.description) || undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    ...(description && { description }),
    ...(product.images.length && { image: product.images.map(image => image.url) }),
    ...(product.brand && { brand: { "@type": "Brand", "name": product.brand } }),
    ...(product.pricePence != null && {
      offers: {
        "@type": "Offer",
        "price": (product.pricePence / 100).toFixed(2),
        "priceCurrency": CURRENCY,
        "availability": "https://schema.org/InStock",
        ...(product.affiliateUrl && { url: product.affiliateUrl }),
        ...(product.retailer && { seller: { "@type": "Organization", "name": product.retailer } }),
      },
    }),
  };
}
