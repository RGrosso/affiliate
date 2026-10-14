import type { z } from "#shared/schemas/zod";
import type { createTagSchema, updateTagSchema } from "#shared/schemas/tags.schema";

type CreateTagData = z.output<typeof createTagSchema>;
type UpdateTagData = z.output<typeof updateTagSchema>;

export class TagService {
  private readonly tags: TagRepository;

  constructor(db: DbExecutor) {
    this.tags = new TagRepository(db);
  }

  list() {
    return this.tags.findAll();
  }

  create({ name, ...details }: CreateTagData) {
    return this.tags.insert({ ...details, name, slug: slugify(name) }).catch(rethrowAsDuplicateTag);
  }

  async update(id: string, { name, ...rest }: UpdateTagData) {
    const values = { ...rest, ...(name !== undefined && { name, slug: slugify(name) }) };
    const tag = Object.keys(values).length
      ? await this.tags.update(id, values).catch(rethrowAsDuplicateTag)
      : await this.tags.findById(id);
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
