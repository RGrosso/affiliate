<template>
  <UForm
    ref="form"
    :schema="schema"
    :state="validated"
    :validate="settle"
    class="space-y-4 [&_input::placeholder]:text-muted [&_textarea::placeholder]:text-muted"
    @submit="onSubmit"
    @error="onError"
  >
    <div class="grid gap-4 lg:grid-cols-3 items-start">
      <!-- Main column -->
      <div class="space-y-4 lg:col-span-2">
        <UCard>
          <div class="space-y-4">
            <UFormField
              v-if="!collection"
              name="type"
            >
              <URadioGroup
                v-model="state.type"
                legend="Type"
                :items="typeItems"
                variant="card"
                class="w-full"
              />
            </UFormField>
            <div v-else>
              <p class="text-sm font-medium text-highlighted">Type</p>
              <p class="text-sm text-muted">{{ collectionTypeLabels[state.type] }}. The type can't be changed once a collection is created.</p>
            </div>

            <UFormField
              label="Title"
              name="title"
              required
            >
              <UInput
                v-model="state.title"
                placeholder="Summer sale"
                class="w-full"
                :autofocus="!collection"
              />
            </UFormField>

            <UFormField
              label="Description"
              name="description"
              :hint="`${state.description.length} of ${DESCRIPTION_MAX} characters used`"
            >
              <UTextarea
                v-model="state.description"
                placeholder="A short introduction shown at the top of the collection"
                :rows="3"
                autoresize
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="!locked"
              name="status"
              :help="isLive ? 'Visible to everyone' : 'Only you can see it'"
            >
              <USwitch
                v-model="isLive"
                label="Live"
                :color="isLive ? 'success' : 'neutral'"
              />
            </UFormField>
          </div>
        </UCard>

        <CoreAlert
          v-if="locked"
          variant="info"
          title="This collection is locked"
          description="It always shows every product, so its URL handle, type, status, sort order and conditions can't change. You can edit the title, description, image and search listing."
        />

        <template v-if="state.type === CollectionType.Automated">
          <UCard>
            <template #header>
              <h2 class="text-sm font-semibold">Conditions</h2>
            </template>

            <p
              v-if="locked"
              class="text-sm text-muted"
            >
              Every product is in this collection.
            </p>
            <CollectionRulesBuilder
              v-else
              v-model="state.rules"
              :tags="tags"
              :retailers="retailers"
            />
          </UCard>

          <CollectionRulesPreview
            v-if="!locked"
            :rules="validRules"
            :sort="state.defaultSort"
          />
        </template>

        <CollectionProducts
          v-else
          v-model="state.products"
        />
      </div>

      <!-- Side column -->
      <div class="space-y-4">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold">Cover image</h2>
              <span class="text-xs text-muted">Cropped to 3:1</span>
            </div>
          </template>

          <div class="space-y-4">
            <div class="relative aspect-[3/1] overflow-hidden rounded-md bg-band text-white">
              <img
                v-if="state.imageUrl"
                :src="state.imageUrl"
                alt=""
                class="absolute inset-0 size-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              <p class="absolute inset-y-0 left-3 right-3 flex items-center text-lg font-bold truncate">
                {{ state.title || "Untitled collection" }}
              </p>
            </div>

            <UFormField name="imageUrl">
              <div class="flex flex-wrap gap-2">
                <label
                  class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-default bg-default px-3 py-1.5 text-sm font-medium hover:bg-elevated focus-within:ring-2 focus-within:ring-primary"
                >
                  <UIcon
                    :name="uploading ? 'i-lucide-loader-circle' : 'i-lucide-upload'"
                    class="size-4"
                    :class="{ 'animate-spin': uploading }"
                  />
                  {{ state.imageUrl ? "Replace image" : "Upload image" }}
                  <input
                    type="file"
                    accept="image/*"
                    class="sr-only"
                    @change="onFileInput"
                  />
                </label>
                <UButton
                  v-if="state.imageUrl"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  @click="removeImage"
                >
                  Remove image
                </UButton>
              </div>
            </UFormField>

            <UFormField
              label="Alt text"
              name="imageAlt"
              help="Describe the image for people who can't see it"
            >
              <UInput
                v-model="state.imageAlt"
                placeholder="Describe the image"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold">Search listing</h2>
              <UButton
                variant="link"
                size="sm"
                :icon="seoOpen ? undefined : 'i-heroicons-pencil-square'"
                @click="seoOpen = !seoOpen"
              >
                {{ seoOpen ? "Done" : "Edit" }}
              </UButton>
            </div>
          </template>

          <div
            v-if="seoPreview.title"
            class="space-y-0.5"
          >
            <p class="text-xs text-muted truncate">
              {{ seoPreview.url }}
            </p>
            <p class="text-lg text-[#1a0dab] dark:text-[#8ab4f8] truncate">
              {{ seoPreview.title }}
            </p>
            <p class="text-sm text-muted line-clamp-2">
              {{ seoPreview.description }}
            </p>
          </div>
          <p
            v-else
            class="text-sm text-muted"
          >
            Add a title and description to see how this collection might appear in a search engine listing.
          </p>

          <div
            v-show="seoOpen"
            class="mt-4 pt-4 border-t border-default space-y-4"
          >
            <UFormField
              label="Page title"
              name="seoTitle"
              :hint="`${state.seoTitle.length} of 70 characters used`"
            >
              <UInput
                v-model="state.seoTitle"
                :placeholder="state.title"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Meta description"
              name="seoDescription"
              :hint="`${state.seoDescription.length} of 320 characters used`"
            >
              <UTextarea
                v-model="state.seoDescription"
                :placeholder="fallbackDescription"
                :rows="3"
                autoresize
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="URL handle"
              name="handle"
              :help="locked ? 'The handle of this collection can\'t be changed' : `${urlPrefix}${state.handle}`"
            >
              <UInput
                v-model="state.handle"
                :disabled="locked"
                class="w-full"
                @update:model-value="handleTouched = true"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold">Default sort</h2>
          </template>

          <UFormField
            name="defaultSort"
            help="How products are ordered unless a visitor chooses otherwise"
          >
            <USelect
              v-model="state.defaultSort"
              :items="sortItems(state.type)"
              :disabled="locked"
              aria-label="Default sort"
              class="w-full"
            />
          </UFormField>
        </UCard>
      </div>
    </div>

    <CoreButtonBar
      :show="isDirty || saving"
      :message="collection ? 'Unsaved changes' : 'Unsaved collection'"
    >
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="saving"
        @click="cancel"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        size="sm"
        :loading="saving"
        :disabled="uploading"
      >
        Save
      </UButton>
    </CoreButtonBar>
  </UForm>
</template>

<script setup lang="ts">
import type { FormError, FormErrorEvent } from "@nuxt/ui";
import { createCollectionSchema, updateCollectionSchema } from "#shared/schemas/collections.schema";
import { collectionRulesSchema } from "#shared/schemas/collectionRules.schema";
import type { ApiSuccess } from "#shared/types/api";
import { CollectionStatus, CollectionType, ProductSort, type AdminCollection } from "#shared/types/collection";
import type { ProductListItem } from "#shared/types/product";
import { newDraftRules, toDraftRules, toRules } from "~/utils/collectionRulesDraft";

const DESCRIPTION_MAX = 500;
const COVER_RATIO = 3;
const COVER_MAX_WIDTH = 1800;
const SEO_FIELDS = ["handle", "seoTitle", "seoDescription"];

const { collection, products = [] } = defineProps<{
  collection?: AdminCollection;
  /** The collection's products in the order they were added, for a hand-picked collection. */
  products?: ProductListItem[];
}>();

const emit = defineEmits<{
  saved: [collection: AdminCollection];
}>();

const toast = useToast();
const form = useTemplateRef("form");
const requestUrl = useRequestURL();
const { tags } = useTags();
const { data: retailerData } = useFetch<ApiSuccess<string[]>>("/api/products/retailers", { key: "admin-retailers" });
const retailers = computed(() => retailerData.value?.data ?? []);

const locked = computed(() => !!collection?.locked);

const typeItems = [
  { label: collectionTypeLabels[CollectionType.Manual], description: "You choose each product yourself", value: CollectionType.Manual },
  {
    label: collectionTypeLabels[CollectionType.Automated],
    description: "Products are added by conditions, such as a tag or retailer",
    value: CollectionType.Automated,
  },
];
const isLive = computed({
  get: () => state.status === CollectionStatus.Published,
  set: live => {
    state.status = live ? CollectionStatus.Published : CollectionStatus.Draft;
  },
});

const toState = (source?: AdminCollection, sourceProducts: ProductListItem[] = []) => ({
  type: source?.type ?? CollectionType.Manual,
  title: source?.title ?? "",
  description: source?.description ?? "",
  handle: source?.handle ?? "",
  imageUrl: source?.imageUrl ?? "",
  imageAlt: source?.imageAlt ?? "",
  seoTitle: source?.seoTitle ?? "",
  seoDescription: source?.seoDescription ?? "",
  // A new hand-picked collection starts in the order products are added
  defaultSort: source?.defaultSort ?? ProductSort.Manual,
  status: source?.status ?? CollectionStatus.Draft,
  rules: source?.rules ? toDraftRules(source.rules) : newDraftRules(),
  products: sourceProducts.map(product => ({ ...product })),
});

const state = reactive(toState(collection, products));

const saving = ref(false);
const uploading = ref(false);
const seoOpen = ref(false);
// When editing, keep the saved handle rather than re-deriving it from the title
const handleTouched = ref(!!collection);

// Auto-fill the handle from the title until the user edits it themselves.
watch(
  () => state.title,
  title => {
    if (!handleTouched.value) state.handle = slugify(title);
  }
);

// Manual order only exists for hand-picked collections
watch(
  () => state.type,
  type => {
    if (collection) return;
    if (type === CollectionType.Manual) state.defaultSort = ProductSort.Manual;
    else if (state.defaultSort === ProductSort.Manual) state.defaultSort = ProductSort.Newest;
  }
);

const isManual = computed(() => state.type === CollectionType.Manual);

// The fields each kind of collection sends. Used for validation and for the request, so they always agree.
function buildBody() {
  const details = {
    title: state.title,
    description: state.description,
    imageUrl: state.imageUrl,
    imageAlt: state.imageAlt,
    seoTitle: state.seoTitle,
    seoDescription: state.seoDescription,
  };
  if (locked.value) return details;

  // The type is sent when editing too: the server accepts the saved one, and the schema needs it to pick the fields
  const fields = { ...details, type: state.type, handle: state.handle, status: state.status, defaultSort: state.defaultSort };
  return isManual.value ? { ...fields, productIds: state.products.map(product => product.id) } : { ...fields, rules: toRules(state.rules) };
}

const validated = computed(buildBody);

// A select menu blurs the field as it closes, just before it commits the chosen value. UForm reads the state again after
// awaiting this, so the value has landed by then. Without it the old empty value flashes an error that the change then clears.
const settle = async (): Promise<FormError[]> => [];
const schema = computed(() => (locked.value ? updateCollectionSchema : createCollectionSchema));

const validRules = computed(() => {
  const rules = toRules(state.rules);
  return collectionRulesSchema.safeParse(rules).success ? rules : null;
});

const snapshot = () => JSON.stringify(buildBody());
const savedSnapshot = ref(snapshot());
const isDirty = computed(() => snapshot() !== savedSnapshot.value);

const { skip: skipLeavePrompt } = useUnsavedChangesGuard(isDirty);

const urlPrefix = computed(() => `${requestUrl.host}/collections/`);
const plainDescription = computed(() => state.description.replace(/\s+/g, " ").trim());
const fallbackDescription = computed(() => plainDescription.value.slice(0, META_DESCRIPTION_LENGTH));

const seoPreview = computed(() => ({
  title: state.seoTitle || state.title,
  description: state.seoDescription || fallbackDescription.value,
  url: `${requestUrl.origin}/collections/${state.handle || slugify(state.title)}`,
}));

async function uploadCover(file: File) {
  uploading.value = true;
  try {
    const cropped = await cropToAspect(file, COVER_RATIO, COVER_MAX_WIDTH);
    const body = new FormData();
    body.append("file", cropped);
    body.append("prefix", "collections");
    const { data } = await $fetch<ApiSuccess<{ url: string }>>("/api/products/images", { method: "POST", body });
    state.imageUrl = data.url;
  } catch (error) {
    toast.add({ title: `Couldn't upload ${file.name}`, description: getApiError(error).message, color: "error" });
  } finally {
    uploading.value = false;
  }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file?.type.startsWith("image/")) uploadCover(file);
}

function removeImage() {
  state.imageUrl = "";
  state.imageAlt = "";
}

function reset(source?: AdminCollection, sourceProducts: ProductListItem[] = []) {
  Object.assign(state, toState(source, sourceProducts));
  handleTouched.value = !!source;
  form.value?.clear();
  savedSnapshot.value = snapshot();
}

function cancel() {
  reset(collection, products);
}

async function onSubmit() {
  if (uploading.value) return;

  saving.value = true;
  try {
    if (collection) {
      const { data } = await $fetch<ApiSuccess<AdminCollection>>(`/api/collections/${collection.id}`, { method: "PATCH", body: buildBody() });
      toast.add({ title: "Collection saved", color: "success" });
      reset(data, state.products);
      emit("saved", data);
    } else {
      await $fetch("/api/collections", { method: "POST", body: buildBody() });
      toast.add({ title: "Collection added", color: "success" });
      savedSnapshot.value = snapshot();
      skipLeavePrompt();
      await navigateTo("/admin/collections");
    }
  } catch (error) {
    const apiError = getApiError(error);
    const fieldErrors = toFormErrors(apiError.fieldErrors);

    if (fieldErrors.length) {
      if (fieldErrors.some(fieldError => SEO_FIELDS.includes(fieldError.name ?? ""))) seoOpen.value = true;
      form.value?.setErrors(fieldErrors);
    }

    toast.add({ title: "Couldn't save collection", description: apiError.message, color: "error" });
  } finally {
    saving.value = false;
  }
}

function onError(event: FormErrorEvent) {
  if (event.errors.some(error => SEO_FIELDS.includes(error.name ?? ""))) seoOpen.value = true;
}
</script>
