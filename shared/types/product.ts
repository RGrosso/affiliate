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

/** What the admin product API returns: the editable fields plus whether it's a sample. */
export type AdminProduct = EditableProduct & {
  isSample: boolean;
};

/** A row in the product list API, with its featured image. */
export type ProductListItem = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  pricePence: number | null;
  retailer: string | null;
  affiliateUrl: string | null;
  isSample: boolean;
  createdAt: Date;
  image: ProductImage | null;
};
