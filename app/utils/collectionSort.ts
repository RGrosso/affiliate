import { ProductSort } from "#shared/types/collection";

const SORT_LABELS: Record<ProductSort, string> = {
  [ProductSort.Manual]: "Featured",
  [ProductSort.Newest]: "Newest",
  [ProductSort.Oldest]: "Oldest",
  [ProductSort.PriceAsc]: "Price: low to high",
  [ProductSort.PriceDesc]: "Price: high to low",
  [ProductSort.TitleAsc]: "A–Z",
  [ProductSort.TitleDesc]: "Z–A",
};

/** The sorts a visitor can pick. "Featured" is the manual order, which only manual collections have. */
export function collectionSortOptions(isManual: boolean) {
  return (Object.keys(SORT_LABELS) as ProductSort[])
    .filter(value => isManual || value !== ProductSort.Manual)
    .map(value => ({ label: SORT_LABELS[value], value }));
}

export function isProductSort(value: unknown, isManual: boolean): value is ProductSort {
  return collectionSortOptions(isManual).some(option => option.value === value);
}
