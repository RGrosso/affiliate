export default defineApiHandler(async event => {
  await requireAdmin(event);

  const deleted = await new ProductService(db).deleteSamples();

  return ok({ deleted }, "Sample products deleted");
});
