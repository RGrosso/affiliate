// These values are persisted in the `collection_type`, `collection_status` and `product_sort` Postgres enums.
// Renaming one needs a migration. The API's values live in `shared/types/collection.ts`, and
// `server/utils/collectionMapper.ts` converts between the two. Keep this file free of imports: `schema.ts` loads it.
export const StoredCollectionType = { Manual: "manual", Automated: "automated" } as const;
export const StoredCollectionStatus = { Draft: "draft", Published: "published" } as const;
export const StoredProductSort = {
  Newest: "newest",
  Oldest: "oldest",
  PriceAsc: "price_asc",
  PriceDesc: "price_desc",
  TitleAsc: "title_asc",
  TitleDesc: "title_desc",
  Manual: "manual",
} as const;

/** The locked All collection, inserted by migration 0006. */
export const ALL_COLLECTION_ID = "00000000-0000-4000-8000-000000000001";

export type StoredCollectionType = (typeof StoredCollectionType)[keyof typeof StoredCollectionType];
export type StoredCollectionStatus = (typeof StoredCollectionStatus)[keyof typeof StoredCollectionStatus];
export type StoredProductSort = (typeof StoredProductSort)[keyof typeof StoredProductSort];
