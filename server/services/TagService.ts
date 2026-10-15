import type { z } from "#shared/schemas/zod";
import type { AdminTag } from "#shared/types/tag";
import type { createTagSchema, updateTagSchema } from "#shared/schemas/tags.schema";

type CreateTagData = z.output<typeof createTagSchema>;
type UpdateTagData = z.output<typeof updateTagSchema>;

export class TagService {
  private readonly tags: TagRepository;
  private readonly collections: CollectionRepository;

  constructor(db: DbExecutor) {
    this.tags = new TagRepository(db);
    this.collections = new CollectionRepository(db);
  }

  /** Each tag comes with the collections that use it, because those stop it being deleted. */
  async list(): Promise<AdminTag[]> {
    const tags = await this.tags.findAll();
    const usage = await this.collections.findUsingTags(tags.map(tag => tag.id));

    return tags.map(tag => ({ ...tag, collections: usage.get(tag.id) ?? [] }));
  }

  async get(id: string) {
    const tag = await this.tags.findById(id);
    if (!tag) {
      throw tagNotFound();
    }

    return tag;
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

  /** A tag that a collection's rules use can't go, or those rules would point at nothing. */
  async delete(id: string) {
    const using = await this.collections.findUsingTag(id);
    if (using.length) {
      throw conflict(`This tag is used by ${formatList(using.map(collection => collection.title))}. Remove it from ${using.length === 1 ? "that collection" : "those collections"} first.`);
    }

    if (!await this.tags.delete(id)) {
      throw tagNotFound();
    }
  }
}
