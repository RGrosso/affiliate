import {
  CollectionStatus,
  CollectionType,
  ProductSort
} from "#shared/types/collection";
import {
  StoredCollectionStatus,
  StoredCollectionType,
  StoredProductSort
} from "./storedCollection";

// Every API value maps to a stored one and back; the Record types make TypeScript flag a missing entry
export const typeToStored: Record<CollectionType, StoredCollectionType> = {
  [CollectionType.Manual]: StoredCollectionType.Manual,
  [CollectionType.Automated]: StoredCollectionType.Automated,
};

export const typeFromStored: Record<StoredCollectionType, CollectionType> = {
  [StoredCollectionType.Manual]: CollectionType.Manual,
  [StoredCollectionType.Automated]: CollectionType.Automated,
};

export const statusToStored: Record<CollectionStatus, StoredCollectionStatus> = {
  [CollectionStatus.Draft]: StoredCollectionStatus.Draft,
  [CollectionStatus.Published]: StoredCollectionStatus.Published,
};

export const statusFromStored: Record<StoredCollectionStatus, CollectionStatus> = {
  [StoredCollectionStatus.Draft]: CollectionStatus.Draft,
  [StoredCollectionStatus.Published]: CollectionStatus.Published,
};

export const sortToStored: Record<ProductSort, StoredProductSort> = {
  [ProductSort.Newest]: StoredProductSort.Newest,
  [ProductSort.Oldest]: StoredProductSort.Oldest,
  [ProductSort.PriceAsc]: StoredProductSort.PriceAsc,
  [ProductSort.PriceDesc]: StoredProductSort.PriceDesc,
  [ProductSort.TitleAsc]: StoredProductSort.TitleAsc,
  [ProductSort.TitleDesc]: StoredProductSort.TitleDesc,
  [ProductSort.Manual]: StoredProductSort.Manual,
};

export const sortFromStored: Record<StoredProductSort, ProductSort> = {
  [StoredProductSort.Newest]: ProductSort.Newest,
  [StoredProductSort.Oldest]: ProductSort.Oldest,
  [StoredProductSort.PriceAsc]: ProductSort.PriceAsc,
  [StoredProductSort.PriceDesc]: ProductSort.PriceDesc,
  [StoredProductSort.TitleAsc]: ProductSort.TitleAsc,
  [StoredProductSort.TitleDesc]: ProductSort.TitleDesc,
  [StoredProductSort.Manual]: ProductSort.Manual,
};
