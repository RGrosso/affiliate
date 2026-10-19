export type CropRegion = {
  /** Source rectangle, centred on the image. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Output size, never larger than the source. */
  width: number;
  height: number;
};

/** The largest centred region of the given width-to-height `ratio`, scaled down to at most `maxWidth` wide and `maxHeight` tall. */
export function cropRegion(width: number, height: number, ratio: number, maxWidth: number, maxHeight = maxWidth): CropRegion {
  const sw = Math.min(width, height * ratio);
  const sh = sw / ratio;
  const scale = Math.min(1, maxWidth / sw, maxHeight / sh);

  return {
    sx: (width - sw) / 2,
    sy: (height - sh) / 2,
    sw,
    sh,
    width: Math.max(1, Math.round(sw * scale)),
    height: Math.max(1, Math.round(sh * scale)),
  };
}

/** Centre-crops an image file to `ratio` (width / height) and scales it down to fit within `maxWidth` x `maxHeight`, stored as WebP. */
export async function cropToAspect(file: File, ratio: number, maxWidth = 1200, maxHeight = maxWidth): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const region = cropRegion(bitmap.width, bitmap.height, ratio, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = region.width;
  canvas.height = region.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser");

  context.drawImage(bitmap, region.sx, region.sy, region.sw, region.sh, 0, 0, region.width, region.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
  if (!blob) throw new Error("Could not process image");

  const name = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${name}.webp`, { type: "image/webp" });
}

/** Product images are stored square, whatever was uploaded. */
export function cropToSquare(file: File, maxSize = 1200): Promise<File> {
  return cropToAspect(file, 1, maxSize);
}
