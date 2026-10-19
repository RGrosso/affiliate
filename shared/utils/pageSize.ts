/** The product grid's column counts at small, medium and large widths. Keep in step with the classes in `ProductGrid.vue`. */
export const PRODUCT_GRID_COLUMNS = [2, 3, 4] as const;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** The smallest page size of at least `target` that fills whole rows at every column count, so no layout ends a page on a short row. */
export function rowAlignedPageSize(target: number, columns: readonly number[]) {
  const step = columns.reduce((lcm, count) => (lcm * count) / gcd(lcm, count), 1);
  return Math.max(step, Math.ceil(target / step) * step);
}
