import type { Tag, TagBadge } from "./tag";

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
  brand: string | null;
  affiliateUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImage[];
  tagIds: string[];
};

/** What the admin product API returns: the editable fields plus whether it's a sample. */
export type AdminProduct = EditableProduct & {
  isSample: boolean;
  tags: Tag[];
};

/** A row in the product list API, with its featured image and tags (highest priority first). Public, so tags are badges only. */
export type ProductListItem = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  pricePence: number | null;
  retailer: string | null;
  affiliateUrl: string | null;
  /** A `Date` on the server, an ISO string once it has come through the API. */
  createdAt: Date | string;
  image: ProductImage | null;
  tags: TagBadge[];
};

/** A product's public page. Every tag is included as a badge, and the description is sanitised HTML. */
export type ProductDetail = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  brand: string | null;
  pricePence: number | null;
  retailer: string | null;
  affiliateUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImage[];
  tags: TagBadge[];
};
