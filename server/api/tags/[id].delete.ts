export default defineApiHandler(async event => {
  await requireAdmin(event);

  const id = await readTagId(event);
  await new TagService(db).delete(id);

  return ok({ id }, "Tag deleted");
});
