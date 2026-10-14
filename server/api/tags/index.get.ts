export default defineApiHandler(async (event) => {
  await requireAdmin(event);

  return ok(await new TagService(db).list());
});
