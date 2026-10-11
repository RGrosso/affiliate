/**
 * Center-crops an image file to a square and scales it down to at most `maxSize` pixels,
 * so every product image is stored square regardless of what was uploaded.
 */
export async function cropToSquare(file: File, maxSize = 1200): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const output = Math.min(side, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = output;
  canvas.height = output;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser");

  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    output,
    output
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
  if (!blob) throw new Error("Could not process image");

  const name = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${name}.webp`, { type: "image/webp" });
}
