import { addProductSchema } from "#shared/schemas/products.schema";

export default defineApiHandler(async event => {
  await requireAdmin(event);

  const id = await readProductId(event);
  const input = await readValidated(event, addProductSchema);

  return ok(await new ProductService(db).update(id, input), "Product saved");
});
