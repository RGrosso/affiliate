export default defineApiHandler(async event => {
  await requireAdmin(event);

  return ok(await new CollectionService(db).get(readCollectionId(event)));
});
