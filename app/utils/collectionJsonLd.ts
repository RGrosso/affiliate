import type { PublicCollection } from "#shared/types/collection";
import type { ProductListItem } from "#shared/types/product";

/** schema.org CollectionPage structured data listing the products on the page so far. `origin` makes the product links absolute. */
export function collectionJsonLd(
  collection: Pick<PublicCollection, "title" | "seoTitle" | "seoDescription" | "imageUrl">,
  products: ProductListItem[],
  origin: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.seoTitle || collection.title,
    ...(collection.seoDescription && { description: collection.seoDescription }),
    ...(collection.imageUrl && { image: collection.imageUrl }),
    ...(products.length && {
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.title,
          url: `${origin}/product/${product.handle}`,
        })),
      },
    }),
  };
}
