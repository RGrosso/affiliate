export const LOCALE = "en-GB";
export const CURRENCY = "GBP";
export const TIME_ZONE = "Europe/London";

export type CurrencyDecimals = 0 | 2;

export type FormatCurrencyOptions = {
  minDecimals?: CurrencyDecimals;
  maxDecimals?: CurrencyDecimals;
};

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(minDecimals: CurrencyDecimals, maxDecimals: CurrencyDecimals) {
  const key = `${minDecimals}-${maxDecimals}`;
  let formatter = currencyFormatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    currencyFormatters.set(key, formatter);
  }

  return formatter;
}

/**
 * Formats an amount in pence as pounds, e.g. 3499 → "£34.99".
 * `maxDecimals: 0` rounds to whole pounds ("£35"); `minDecimals: 0` drops ".00" from whole
 * amounts ("£429") but keeps both pence digits otherwise ("£34.90").
 */
export function formatCurrency(
  pence: number | null | undefined,
  { minDecimals = 2, maxDecimals = 2 }: FormatCurrencyOptions = {}
): string | null {
  if (pence == null) return null;

  const pounds = pence / 100;
  const min = Math.min(minDecimals, maxDecimals) as CurrencyDecimals;

  // "Drop .00 only": with 0–2 decimals Intl would also turn £34.90 into £34.9
  if (min === 0 && maxDecimals === 2 && !Number.isInteger(pounds)) {
    return currencyFormatter(2, 2).format(pounds);
  }

  return currencyFormatter(min, maxDecimals).format(pounds);
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: TIME_ZONE });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE });

export function formatDate(value: string | number | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | number | Date): string {
  return dateTimeFormatter.format(new Date(value));
}
