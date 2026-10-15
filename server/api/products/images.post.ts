import { blob, ensureBlob } from "hub:blob";

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

  const stored = await blob.put(file.name, file, {
    addRandomSuffix: true,
    prefix: "products",
  });

  return ok({ url: `/images/${stored.pathname}` });
});
