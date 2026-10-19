import { updateCollectionSchema } from "#shared/schemas/collections.schema";

export default defineApiHandler(async event => {
  await requireAdmin(event);

  const id = readCollectionId(event);
  const input = await readValidated(event, updateCollectionSchema);

  return ok(await new CollectionService(db).update(id, input), "Collection saved");
});
