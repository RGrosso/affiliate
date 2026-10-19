import { updateTagSchema } from "#shared/schemas/tags.schema";

export default defineApiHandler(async event => {
  await requireAdmin(event);

  const id = await readTagId(event);
  const input = await readValidated(event, updateTagSchema);

  return ok(await new TagService(db).update(id, input), "Tag saved");
});
