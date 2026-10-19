import { describe, expect, it } from "vitest";

async function makeImage(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#336699";
  context.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  return new File([blob!], "photo.final.png", { type: "image/png" });
}

async function sizeOf(file: File) {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

describe("cropToAspect", () => {
  it("crops to the ratio and returns a WebP named after the original", async () => {
    const result = await cropToAspect(await makeImage(900, 600), 3);

    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("photo.final.webp");
    expect(await sizeOf(result)).toEqual({ width: 900, height: 300 });
  });

  it("scales a large image down to the maximum width", async () => {
    const result = await cropToAspect(await makeImage(3000, 2000), 3, 1800);

    expect(await sizeOf(result)).toEqual({ width: 1800, height: 600 });
  });
});

describe("cropToAspect with a tiny image", () => {
  it("keeps at least one pixel in each direction", async () => {
    const result = await cropToAspect(await makeImage(1, 1), 3, 1800);

    expect(await sizeOf(result)).toEqual({ width: 1, height: 1 });
  });
});

describe("cropToSquare", () => {
  it("still crops to a square within the maximum size", async () => {
    const result = await cropToSquare(await makeImage(800, 500), 400);

    expect(await sizeOf(result)).toEqual({ width: 400, height: 400 });
  });
});
