import { describe, expect, it } from "vitest";
import { rowAlignedPageSize } from "./pageSize";

describe("rowAlignedPageSize", () => {
  it("rounds up to a multiple of every column count", () => {
    expect(rowAlignedPageSize(20, [2, 3, 4])).toBe(24);
    expect(rowAlignedPageSize(25, [2, 3, 4])).toBe(36);
  });

  it("keeps a target that already fits", () => {
    expect(rowAlignedPageSize(24, [2, 3, 4])).toBe(24);
    expect(rowAlignedPageSize(12, [2, 3, 4])).toBe(12);
  });

  it("never goes below one full row of every layout", () => {
    expect(rowAlignedPageSize(1, [2, 3, 4])).toBe(12);
    expect(rowAlignedPageSize(0, [5])).toBe(5);
  });

  it("handles column counts that share factors", () => {
    expect(rowAlignedPageSize(10, [2, 4])).toBe(12);
    expect(rowAlignedPageSize(7, [6, 4])).toBe(12);
  });

  it("returns the target for a single column", () => {
    expect(rowAlignedPageSize(7, [1])).toBe(7);
  });
});
