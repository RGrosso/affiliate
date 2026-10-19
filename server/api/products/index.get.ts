import { productListQuerySchema } from "#shared/schemas/products.schema";

export default defineApiHandler(async event => {
  const { allTags, ...query } = readValidatedQuery(event, productListQuerySchema);
  // Asked for explicitly rather than read from the session, so an admin browsing the shop sees what visitors see
  if (allTags) await requireAdmin(event);

  return ok(await new ProductService(db).list(query, { forAdmin: !!allTags }));
});
