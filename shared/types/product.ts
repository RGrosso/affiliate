/** The fields the admin product form reads and writes. */
export type EditableProduct = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  priceCents: number | null;
  retailer: string | null;
  affiliateUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: { url: string; alt: string | null }[];
};
