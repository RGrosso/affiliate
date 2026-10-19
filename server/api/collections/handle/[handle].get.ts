// Anyone can read a published collection; only an admin session also sees drafts
export default defineApiHandler(async event => {
  const handle = readCollectionHandle(event);

  return ok(await new CollectionService(db).getByHandle(handle, { isAdmin: await isAdminRequest(event) }));
});
