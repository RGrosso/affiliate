export default defineApiHandler(async event => {
  await requireAdmin(event);

  const id = readCollectionId(event);
  await new CollectionService(db).delete(id);

  return ok({ id }, "Collection deleted");
});
