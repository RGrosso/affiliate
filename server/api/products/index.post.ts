import { addProductSchema } from "#shared/schemas/products.schema";

export default defineApiHandler(async (event) => {
  const { user } = await requireAdmin(event);
  const input = await readValidated(event, addProductSchema);

  const product = await new ProductService(db).create(input, user.id);

  return ok(product, "Product added successfully");
});
