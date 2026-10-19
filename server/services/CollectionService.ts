import type { CollectionRow } from "hub:db:schema";
import type { CollectionProductsQuery, CreateCollectionData, PreviewCollectionData, UpdateCollectionData } from "#shared/schemas/collections.schema";
import { MANUAL_SORT_MESSAGE } from "#shared/schemas/collections.schema";
import type { ApiFieldErrors } from "#shared/types/api";
import {
  CollectionStatus,
  CollectionType,
  ProductSort,
  type AdminCollection,
  type AdminCollectionListItem,
  type CollectionPreview,
  type CollectionProductsPage,
  type PublicCollection,
} from "#shared/types/collection";
import { collectTagIds, describeRules } from "#shared/utils/collectionRules";
import type { ProductScope } from "../repositories/ProductRepository";
import { fromStoredRules, toStoredRules } from "../utils/collectionRulesMapper";
import { parseStoredRules } from "../utils/storedCollectionRules";
import { sortFromStored, sortToStored, statusFromStored, statusToStored, typeFromStored, typeToStored } from "../utils/collectionMapper";

const PREVIEW_SIZE = 12;
const LOCKED_MESSAGE = "This can't be changed on the all products collection";
const FIELD_ERRORS_MESSAGE = "Please check the highlighted fields and try again";

const storedRulesOf = (row: CollectionRow) => (row.rules ? parseStoredRules(row.rules) : null);

export class CollectionService {
  private readonly collections: CollectionRepository;
  private readonly products: ProductRepository;
  private readonly tags: TagRepository;
  private readonly productService: ProductService;

  constructor(private readonly db: DbExecutor) {
    this.collections = new CollectionRepository(db);
    this.products = new ProductRepository(db);
    this.tags = new TagRepository(db);
    this.productService = new ProductService(db);
  }

  /** Every collection with how many products it holds and, for automated ones, a sentence describing the rules. */
  async list(): Promise<AdminCollectionListItem[]> {
    const [rows, manualCounts] = await Promise.all([this.collections.findAll(), this.collections.countProducts()]);

    const apiRules = new Map(
      rows.map(row => {
        const stored = storedRulesOf(row);
        return [row.id, stored && fromStoredRules(stored)] as const;
      })
    );
    const tagIds = [...new Set([...apiRules.values()].flatMap(rules => (rules ? collectTagIds(rules) : [])))];
    const tagNames = new Map((await this.tags.findByIds(tagIds)).map(tag => [tag.id, tag.name]));

    return Promise.all(
      rows.map(async row => {
        const type = typeFromStored[row.type];
        const rules = apiRules.get(row.id) ?? null;
        const isManual = type === CollectionType.Manual;

        return {
          id: row.id,
          title: row.title,
          handle: row.handle,
          type,
          status: statusFromStored[row.status],
          locked: row.locked,
          productCount: isManual ? (manualCounts.get(row.id) ?? 0) : await this.products.countMatching({ rules: storedRulesOf(row) }),
          rulesSummary: isManual ? null : rules ? describeRules(rules, tagNames) : "Every product",
          updatedAt: row.updatedAt,
        };
      })
    );
  }

  async get(id: string): Promise<AdminCollection> {
    const row = await this.collections.findById(id);
    if (!row) {
      throw collectionNotFound();
    }

    const type = typeFromStored[row.type];
    const stored = storedRulesOf(row);

    return {
      id: row.id,
      title: row.title,
      handle: row.handle,
      type,
      status: statusFromStored[row.status],
      locked: row.locked,
      description: row.description,
      imageUrl: row.imageUrl,
      imageAlt: row.imageAlt,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      defaultSort: sortFromStored[row.defaultSort],
      rules: stored && fromStoredRules(stored),
      productIds: type === CollectionType.Manual ? await this.collections.findProductIds(row.id) : [],
    };
  }

  async create(input: CreateCollectionData) {
    const handle = resolveCollectionHandle(input.handle, input.title);
    const isAutomated = input.type === CollectionType.Automated;

    const { id } = await this.db
      .transaction(async tx => {
        const collections = new CollectionRepository(tx);
        if (input.type === CollectionType.Manual) {
          await this.assertProductsExist(new ProductRepository(tx), input.productIds);
        } else {
          await this.assertTagsExist(new TagRepository(tx), collectTagIds(input.rules));
        }

        const collection = await collections.insert({
          title: input.title,
          handle,
          type: typeToStored[input.type],
          status: statusToStored[input.status],
          description: input.description,
          imageUrl: input.imageUrl,
          imageAlt: input.imageAlt,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          defaultSort: sortToStored[input.defaultSort],
          rules: isAutomated ? toStoredRules(input.rules) : null,
        });

        if (input.type === CollectionType.Manual) {
          await collections.replaceProducts(collection.id, input.productIds);
        }
        return collection;
      })
      .catch(rethrowAsDuplicateCollectionHandle);

    return this.get(id);
  }

  /**
   * Changes only the fields sent. The type is fixed, and rules or products only apply to the type that uses them.
   * On the locked All collection only the title, description, image and SEO fields can change. A handle, status or
   * sort that matches what is saved is accepted, so a form that sends everything back still works.
   */
  async update(id: string, input: UpdateCollectionData) {
    await this.db
      .transaction(async tx => {
        const collections = new CollectionRepository(tx);
        const existing = await collections.findById(id);
        if (!existing) {
          throw collectionNotFound();
        }

        const type = typeFromStored[existing.type];
        const errors = this.findFieldErrors(existing, type, input);
        if (Object.keys(errors).length) {
          throw apiError("VALIDATION_ERROR", FIELD_ERRORS_MESSAGE, errors);
        }

        if (input.rules) await this.assertTagsExist(new TagRepository(tx), collectTagIds(input.rules));
        if (input.productIds) await this.assertProductsExist(new ProductRepository(tx), input.productIds);

        const { type: _type, productIds, rules, status, defaultSort, handle, ...details } = input;
        // undefined fields are left alone. updatedAt is always set so a change to the products alone still counts
        await collections.update(id, {
          ...details,
          handle: handle !== undefined && handle !== existing.handle ? resolveCollectionHandle(handle, existing.title) : undefined,
          status: status && statusToStored[status],
          defaultSort: defaultSort && sortToStored[defaultSort],
          rules: rules && toStoredRules(rules),
          updatedAt: new Date(),
        });

        if (productIds) await collections.replaceProducts(id, productIds);
      })
      .catch(rethrowAsDuplicateCollectionHandle);

    return this.get(id);
  }

  private findFieldErrors(existing: CollectionRow, type: CollectionType, input: UpdateCollectionData) {
    const errors: ApiFieldErrors = {};
    const reject = (field: string, message: string) => {
      errors[field] ??= [message];
    };

    if (existing.locked) {
      if (input.handle !== undefined && input.handle !== existing.handle) reject("handle", LOCKED_MESSAGE);
      if (input.status !== undefined && statusToStored[input.status] !== existing.status) reject("status", LOCKED_MESSAGE);
      if (input.defaultSort !== undefined && sortToStored[input.defaultSort] !== existing.defaultSort) reject("defaultSort", LOCKED_MESSAGE);
      if (input.rules !== undefined) reject("rules", LOCKED_MESSAGE);
    }

    if (input.type !== undefined && input.type !== type) {
      reject("type", "The type of a collection can't be changed");
    }

    if (type === CollectionType.Manual && input.rules !== undefined) {
      reject("rules", "Collections where you pick the products don't use rules");
    }

    if (type === CollectionType.Automated) {
      if (input.productIds !== undefined) reject("productIds", "Automated collections choose their products with rules");
      if (input.defaultSort === ProductSort.Manual) reject("defaultSort", MANUAL_SORT_MESSAGE);
    }

    return errors;
  }

  async delete(id: string) {
    const collection = await this.collections.findById(id);
    if (!collection) {
      throw collectionNotFound();
    }

    if (collection.locked) {
      throw conflict("The all products collection is built in, so it can't be deleted");
    }

    await this.collections.delete(id);
  }

  /** The public page. A draft is only visible to an admin. */
  async getByHandle(handle: string, { isAdmin = false }: { isAdmin?: boolean } = {}): Promise<PublicCollection> {
    const row = await this.findVisible(handle, isAdmin);

    return {
      id: row.id,
      title: row.title,
      handle: row.handle,
      description: row.description,
      imageUrl: row.imageUrl,
      imageAlt: row.imageAlt,
      defaultSort: sortFromStored[row.defaultSort],
      isDraft: row.status === statusToStored[CollectionStatus.Draft],
      ...resolveCollectionSeo(row),
    };
  }

  /** A page of the collection's products in the requested sort (its default when none), with the tag filters on page 1. */
  async listProducts(handle: string, query: CollectionProductsQuery, { isAdmin = false }: { isAdmin?: boolean } = {}): Promise<CollectionProductsPage> {
    const row = await this.findVisible(handle, isAdmin);
    const isManual = typeFromStored[row.type] === CollectionType.Manual;
    const sort = query.sort ?? sortFromStored[row.defaultSort];

    if (sort === ProductSort.Manual && !isManual) {
      throw apiError("VALIDATION_ERROR", FIELD_ERRORS_MESSAGE, { sort: [MANUAL_SORT_MESSAGE] });
    }

    const scope: ProductScope = isManual ? { collectionId: row.id } : { rules: storedRulesOf(row) };
    const [{ items, total }, facets] = await Promise.all([
      this.products.findPage({ page: query.page, pageSize: query.pageSize, tag: query.tag ? [query.tag] : undefined }, { ...scope, sort }),
      query.page === 1 ? this.products.findTagFacets(scope) : undefined,
    ]);

    return {
      ...toPagedResult(await this.productService.toListItems(items), total, query),
      ...(facets && { facets: { tags: facets } }),
    };
  }

  /** The first products a set of rules would pick, so the form can show the result before saving. */
  async preview({ rules, sort }: PreviewCollectionData): Promise<CollectionPreview> {
    await this.assertTagsExist(this.tags, collectTagIds(rules));

    const { items, total } = await this.products.findPage({ page: 1, pageSize: PREVIEW_SIZE }, { rules: toStoredRules(rules), sort });

    return { total, items: await this.productService.toListItems(items) };
  }

  private async findVisible(handle: string, isAdmin: boolean) {
    const row = await this.collections.findByHandle(handle);
    if (!row || (!isAdmin && row.status === statusToStored[CollectionStatus.Draft])) {
      throw collectionNotFound();
    }

    return row;
  }

  /** Catches a tag deleted since the form loaded, which the rules would otherwise point at silently. */
  private async assertTagsExist(tags: TagRepository, tagIds: string[]) {
    if (!tagIds.length) return;

    if ((await tags.findByIds(tagIds)).length !== tagIds.length) {
      throw apiError("VALIDATION_ERROR", FIELD_ERRORS_MESSAGE, {
        rules: ["One of these tags no longer exists. Please refresh and try again"],
      });
    }
  }

  /** Catches a product deleted since the form loaded, which would otherwise fail on the foreign key. */
  private async assertProductsExist(products: ProductRepository, productIds: string[]) {
    if ((await products.findExistingIds(productIds)).length !== new Set(productIds).size) {
      throw apiError("VALIDATION_ERROR", FIELD_ERRORS_MESSAGE, {
        productIds: ["One of these products no longer exists. Please refresh and try again"],
      });
    }
  }
}
