import { describe, expect, it } from "vitest";
import { cropRegion } from "./cropImage";

describe("cropRegion", () => {
  it("crops a landscape image to a square from the centre", () => {
    expect(cropRegion(2000, 1000, 1, 1200)).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000, width: 1000, height: 1000 });
  });

  it("crops a portrait image to a square from the centre", () => {
    expect(cropRegion(1000, 3000, 1, 1200)).toEqual({ sx: 0, sy: 1000, sw: 1000, sh: 1000, width: 1000, height: 1000 });
  });

  it("scales a large square down to the maximum", () => {
    expect(cropRegion(4000, 4000, 1, 1200)).toMatchObject({ width: 1200, height: 1200 });
  });

  it("crops to a 3:1 banner, trimming the top and bottom of a squarish image", () => {
    expect(cropRegion(1200, 1200, 3, 1800)).toEqual({ sx: 0, sy: 400, sw: 1200, sh: 400, width: 1200, height: 400 });
  });

  it("scales a wide banner down so it is at most the maximum width", () => {
    expect(cropRegion(6000, 3000, 3, 1800)).toMatchObject({ sx: 0, sy: 500, sw: 6000, sh: 2000, width: 1800, height: 600 });
  });

  it("trims the sides of a very wide image to fit the ratio", () => {
    expect(cropRegion(6000, 1000, 3, 1800)).toMatchObject({ sx: 1500, sy: 0, sw: 3000, sh: 1000, width: 1800, height: 600 });
  });

  it("never enlarges a small image", () => {
    expect(cropRegion(300, 300, 1, 1200)).toMatchObject({ width: 300, height: 300 });
  });

  it("limits the height as well when a maximum height is given", () => {
    expect(cropRegion(1000, 4000, 0.5, 2000, 800)).toMatchObject({ width: 400, height: 800 });
  });
});
