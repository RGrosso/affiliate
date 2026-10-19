import type { CollectionRules } from "./collectionRules";
import type { PagedResult } from "./pagination";
import type { ProductListItem } from "./product";
import type { TagBadge } from "./tag";

// The API's values. What the database stores is defined separately in `server/utils/storedCollection.ts`.
export const CollectionType = { Manual: "manual", Automated: "automated" } as const;
export const CollectionStatus = { Draft: "draft", Published: "published" } as const;
export const ProductSort = {
  Newest: "newest",
  Oldest: "oldest",
  PriceAsc: "price-asc",
  PriceDesc: "price-desc",
  TitleAsc: "title-asc",
  TitleDesc: "title-desc",
  /** Order added. Only manual collections have one. */
  Manual: "manual",
} as const;

export type CollectionType = (typeof CollectionType)[keyof typeof CollectionType];
export type CollectionStatus = (typeof CollectionStatus)[keyof typeof CollectionStatus];
export type ProductSort = (typeof ProductSort)[keyof typeof ProductSort];

/** The locked collection of every product. Its page is `/collections/all`, so no other collection can use the handle. */
export const ALL_COLLECTION_HANDLE = "all";

export type CollectionSummary = {
  id: string;
  title: string;
};

/** A row in the admin list. `rulesSummary` is a sentence describing an automated collection's rules. */
export type AdminCollectionListItem = {
  id: string;
  title: string;
  handle: string;
  type: CollectionType;
  status: CollectionStatus;
  locked: boolean;
  productCount: number;
  rulesSummary: string | null;
  /** A `Date` on the server, an ISO string once it has come through the API. */
  updatedAt: Date | string;
};

/** What the admin form edits. `productIds` is in the order they were added, and empty for automated collections. */
export type AdminCollection = {
  id: string;
  title: string;
  handle: string;
  type: CollectionType;
  status: CollectionStatus;
  locked: boolean;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  defaultSort: ProductSort;
  rules: CollectionRules | null;
  productIds: string[];
};

/** A collection's public page: no rules, and the SEO fields already fall back to the title and description. */
export type PublicCollection = {
  id: string;
  title: string;
  handle: string;
  /** Only a manual collection can be sorted by the order products were added. */
  type: CollectionType;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  defaultSort: ProductSort;
  /** True when only an admin can see it. */
  isDraft: boolean;
  seoTitle: string;
  seoDescription: string | null;
};

/** A tag visitors can filter by, with how many of the collection's products have it. */
export type TagFacet = TagBadge & {
  count: number;
};

export type CollectionFacets = {
  tags: TagFacet[];
};

/** Facets are only sent with the first page. */
export type CollectionProductsPage = PagedResult<ProductListItem> & {
  facets?: CollectionFacets;
};

export type CollectionPreview = {
  total: number;
  items: ProductListItem[];
};
