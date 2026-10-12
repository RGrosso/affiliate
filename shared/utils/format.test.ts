import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime } from "./format";

describe("formatCurrency", () => {
  it("formats pence as pounds with two decimals", () => {
    expect(formatCurrency(3499)).toBe("£34.99");
    expect(formatCurrency(0)).toBe("£0.00");
    expect(formatCurrency(123456789)).toBe("£1,234,567.89");
  });

  it("returns null for a missing price", () => {
    expect(formatCurrency(null)).toBeNull();
    expect(formatCurrency(undefined)).toBeNull();
  });

  it("drops .00 from whole amounts with minDecimals: 0, but keeps both pence digits otherwise", () => {
    expect(formatCurrency(42900, { minDecimals: 0 })).toBe("£429");
    expect(formatCurrency(3490, { minDecimals: 0 })).toBe("£34.90");
  });

  it("rounds to whole pounds with maxDecimals: 0", () => {
    expect(formatCurrency(3499, { maxDecimals: 0 })).toBe("£35");
    expect(formatCurrency(3449, { maxDecimals: 0 })).toBe("£34");
  });
});

describe("formatDate", () => {
  it("puts the day before the month", () => {
    expect(formatDate("2026-10-12T09:00:00Z")).toBe("12 Oct 2026");
  });

  it("uses the London date, not UTC, just after midnight in summer", () => {
    expect(formatDate("2026-07-01T23:30:00Z")).toBe("2 Jul 2026");
  });
});

describe("formatDateTime", () => {
  it("uses the 24-hour clock in British Summer Time", () => {
    expect(formatDateTime("2026-10-12T13:05:00Z")).toBe("12 Oct 2026, 14:05");
  });

  it("uses GMT in winter", () => {
    expect(formatDateTime("2026-01-12T13:05:00Z")).toBe("12 Jan 2026, 13:05");
  });
});
