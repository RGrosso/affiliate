const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatPrice(cents: number | null | undefined): string | null {
  return cents == null ? null : priceFormatter.format(cents / 100);
}
