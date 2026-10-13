import { describe, expect, it } from "vitest";
import { totalPagesFor } from "./pagination";

describe("totalPagesFor", () => {
  it("counts a partial last page and no pages when empty", () => {
    expect(totalPagesFor(45, 20)).toBe(3);
    expect(totalPagesFor(40, 20)).toBe(2);
    expect(totalPagesFor(0, 20)).toBe(0);
  });
});
