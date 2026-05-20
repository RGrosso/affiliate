import { addProductSchema } from "@@/schemas/products.schema";
import { products } from "hub:db:schema";
import z from "zod";

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event);

  if (!user || user.role !== "admin") {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden: Admin privileges required",
    });
  }

  const body = await readBody(event);
  const result = addProductSchema.safeParse(body);

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Validation Error",
      data: z.treeifyError(result.error),
    });
  }

  const { title, description } = result.data;
  const authorId = user.id;

  await db.insert(products).values({
    title,
    description,
    authorId,
  });

  return {
    success: true,
    message: "Product added successfully",
  };
});
