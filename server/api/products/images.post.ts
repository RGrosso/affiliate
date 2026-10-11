import { blob, ensureBlob } from "hub:blob";

export default defineApiHandler(async (event) => {
  await requireAdmin(event);

  const form = await readFormData(event);
  const file = form.get("file");

  if (!(file instanceof File)) {
    throw badRequest("Please choose an image to upload");
  }

  try {
    ensureBlob(file, { maxSize: "8MB", types: ["image"] });
  } catch (error) {
    throw badRequest(error instanceof Error ? error.message : "That file isn't a valid image");
  }

  const stored = await blob.put(file.name, file, {
    addRandomSuffix: true,
    prefix: "products",
  });

  return ok({ url: `/images/${stored.pathname}` });
});
