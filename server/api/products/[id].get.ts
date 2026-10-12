export default defineApiHandler(async (event) => {
  await requireAdmin(event);

  const product = await findProductWithImages(await readProductId(event));

  if (!product) {
    throw notFound("We couldn't find that product");
  }

  return ok(product);
});
