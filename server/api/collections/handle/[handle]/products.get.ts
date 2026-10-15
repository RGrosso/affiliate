import { collectionProductsQuerySchema } from "#shared/schemas/collections.schema";

export default defineApiHandler(async (event) => {
  const handle = readCollectionHandle(event);
  const query = readValidatedQuery(event, collectionProductsQuerySchema);

  return ok(await new CollectionService(db).listProducts(handle, query, { isAdmin: await isAdminRequest(event) }));
});
