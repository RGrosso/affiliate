import { createTagSchema } from "#shared/schemas/tags.schema";

export default defineApiHandler(async (event) => {
  await requireAdmin(event);
  const input = await readValidated(event, createTagSchema);

  return ok(await new TagService(db).create(input), "Tag added");
});
