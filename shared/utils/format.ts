export const LOCALE = "en-GB";
export const CURRENCY = "GBP";

const priceFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: "Europe/London" });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export function formatPrice(pence: number | null | undefined): string | null {
  return pence == null ? null : priceFormatter.format(pence / 100);
}

export function formatDate(value: string | number | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | number | Date): string {
  return dateTimeFormatter.format(new Date(value));
}
