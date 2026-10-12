export type ProductImage = {
  url: string;
  alt: string | null;
};

export type EditableProduct = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  pricePence: number | null;
  retailer: string | null;
  affiliateUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImage[];
};
