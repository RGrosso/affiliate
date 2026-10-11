export default defineApiHandler(async (event) => {
  await requireAdmin(event);

  const { id } = await getValidatedRouterParams(event, params => productIdSchema.parse(params))
    .catch(() => {
      throw notFound("We couldn't find that product");
    });

  const product = await findProductWithImages(id);

  if (!product) {
    throw notFound("We couldn't find that product");
  }

  return ok(product);
});
