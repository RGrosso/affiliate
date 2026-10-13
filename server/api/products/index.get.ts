import { pageQuerySchema } from "#shared/schemas/pagination.schema";

export default defineApiHandler(async (event) => {
  const query = readValidatedQuery(event, pageQuerySchema);

  return ok(await new ProductService(db).list(query));
});
