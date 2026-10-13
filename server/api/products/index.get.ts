import { pageQuerySchema } from "#shared/schemas/pagination.schema";
import { z } from "#shared/schemas/zod";

const productListQuerySchema = pageQuerySchema.extend({
  tag: z.string().trim().max(100).optional(),
});

export default defineApiHandler(async (event) => {
  const query = readValidatedQuery(event, productListQuerySchema);

  return ok(await new ProductService(db).list(query));
});
