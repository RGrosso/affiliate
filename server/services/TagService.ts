import type { z } from "#shared/schemas/zod";
import type { createTagSchema, updateTagSchema } from "#shared/schemas/tags.schema";

type CreateTagInput = z.output<typeof createTagSchema>;
type UpdateTagInput = z.output<typeof updateTagSchema>;

export class TagService {
  private readonly tags: TagRepository;

  constructor(db: DbExecutor) {
    this.tags = new TagRepository(db);
  }

  list() {
    return this.tags.findAll();
  }

  create({ name }: CreateTagInput) {
    return this.tags.insert({ name, slug: toTagSlug(name) }).catch(rethrowAsDuplicateTag);
  }

  async update(id: string, input: UpdateTagInput) {
    const tag = await this.tags.update(id, { ...input, slug: toTagSlug(input.name) }).catch(rethrowAsDuplicateTag);
    if (!tag) {
      throw tagNotFound();
    }

    return tag;
  }

  async delete(id: string) {
    if (!await this.tags.delete(id)) {
      throw tagNotFound();
    }
  }
}
