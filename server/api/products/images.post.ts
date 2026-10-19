import { blob, ensureBlob } from "hub:blob";
import { imagePrefixSchema } from "#shared/schemas/imageUpload.schema";

// Collection covers are uploaded here too, kept apart from product images by the prefix
export default defineApiHandler(async event => {
  await requireAdmin(event);

  const form = await readFormData(event);
  const file = form.get("file");

  if (!(file instanceof File)) {
    throw badRequest("Please choose an image to upload");
  }

  if (!file.type.startsWith("image/")) {
    throw badRequest("That file isn't an image. Please upload a JPG, PNG or WebP.");
  }

  try {
    ensureBlob(file, { maxSize: "8MB", types: ["image"] });
  } catch {
    throw badRequest("Images can be at most 8MB. Please choose a smaller image.");
  }

  const prefix = imagePrefixSchema.safeParse(form.get("prefix") ?? "products");
  if (!prefix.success) {
    throw badRequest(prefix.error.issues[0]?.message ?? "Please choose where the image belongs");
  }

  const stored = await blob.put(file.name, file, {
    addRandomSuffix: true,
    prefix: prefix.data,
  });

  return ok({ url: `/images/${stored.pathname}` });
});
