import { createCollectionSchema } from "#shared/schemas/collections.schema";

export default defineApiHandler(async (event) => {
  await requireAdmin(event);
  const input = await readValidated(event, createCollectionSchema);

  return ok(await new CollectionService(db).create(input), "Collection added");
});
