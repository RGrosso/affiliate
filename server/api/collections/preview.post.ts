import { previewCollectionSchema } from "#shared/schemas/collections.schema";

export default defineApiHandler(async event => {
  await requireAdmin(event);
  const input = await readValidated(event, previewCollectionSchema);

  return ok(await new CollectionService(db).preview(input));
});
