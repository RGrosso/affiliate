<template>
  <UForm
    ref="form"
    :schema="addProductSchema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
    @error="onError"
  >
    <div class="grid gap-4 lg:grid-cols-3 items-start">
      <!-- Main column -->
      <div class="space-y-4 lg:col-span-2">
        <UCard>
          <div class="space-y-4">
            <UFormField
              label="Title"
              name="title"
              required
            >
              <UInput
                v-model="state.title"
                placeholder="Short sleeve t-shirt"
                class="w-full"
                :autofocus="!product"
              />
            </UFormField>

            <UFormField
              label="Description"
              name="description"
            >
              <div class="rounded-md border border-default overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <UEditor
                  v-slot="{ editor }"
                  v-model="state.description"
                  content-type="html"
                  placeholder="Describe the product and why you recommend it…"
                  class="w-full min-h-48"
                  :ui="{ base: 'px-4 py-3 min-h-44' }"
                >
                  <UEditorToolbar
                    :editor="editor"
                    :items="toolbarItems"
                    class="border-b border-default bg-elevated/50 px-1 py-1 overflow-x-auto"
                  />
                </UEditor>
              </div>
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold">
                Media
              </h2>
              <span class="text-xs text-muted">Images are cropped to square</span>
            </div>
          </template>

          <UFormField name="images">
            <div
              v-if="media.length"
              class="grid grid-cols-3 sm:grid-cols-4 gap-3"
            >
              <div
                v-for="(item, index) in media"
                :key="item.key"
                class="group relative aspect-square rounded-lg border border-default overflow-hidden bg-muted cursor-grab"
                :class="[
                  index === 0 ? 'col-span-2 row-span-2' : '',
                  dragIndex === index ? 'opacity-40' : '',
                ]"
                draggable="true"
                @dragstart="dragIndex = index"
                @dragover.prevent
                @drop.prevent="moveTo(index)"
                @dragend="dragIndex = null"
              >
                <img
                  :src="item.previewUrl"
                  :alt="item.alt"
                  class="size-full object-cover"
                >
                <div
                  v-if="item.status === 'uploading'"
                  class="absolute inset-0 flex items-center justify-center bg-default/60"
                >
                  <UIcon
                    name="i-lucide-loader-circle"
                    class="size-6 animate-spin"
                  />
                </div>
                <div
                  v-else-if="item.status === 'error'"
                  class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-error/70 text-inverted text-xs p-2 text-center"
                >
                  <UIcon
                    name="i-heroicons-exclamation-triangle"
                    class="size-5"
                  />
                  Upload failed
                </div>
                <UBadge
                  v-if="index === 0"
                  class="absolute bottom-2 left-2"
                  color="neutral"
                  variant="solid"
                  size="sm"
                >
                  Featured
                </UBadge>
                <div class="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                  <UPopover>
                    <UButton
                      icon="i-lucide-text"
                      color="neutral"
                      variant="solid"
                      size="xs"
                      aria-label="Edit alt text"
                    />
                    <template #content>
                      <div class="p-3 w-64 space-y-2">
                        <p class="text-xs font-medium">
                          Alt text
                        </p>
                        <UInput
                          v-model="item.alt"
                          placeholder="Describe the image"
                          class="w-full"
                          size="sm"
                        />
                      </div>
                    </template>
                  </UPopover>
                  <UButton
                    icon="i-lucide-trash-2"
                    color="neutral"
                    variant="solid"
                    size="xs"
                    aria-label="Remove image"
                    @click="remove(index)"
                  />
                </div>
              </div>

              <label
                v-if="media.length < MAX_PRODUCT_IMAGES"
                class="aspect-square rounded-lg border-2 border-dashed border-default flex items-center justify-center text-muted hover:bg-elevated/50 cursor-pointer"
                :class="{ 'border-primary bg-primary/5': dropActive }"
                @dragover.prevent="dropActive = dragIndex === null"
                @dragleave="dropActive = false"
                @drop.prevent="onDrop"
              >
                <UIcon
                  name="i-heroicons-plus"
                  class="size-6"
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  class="sr-only"
                  @change="onFileInput"
                >
              </label>
            </div>

            <label
              v-else
              class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-default p-10 text-center cursor-pointer hover:bg-elevated/50"
              :class="{ 'border-primary bg-primary/5': dropActive }"
              @dragover.prevent="dropActive = true"
              @dragleave="dropActive = false"
              @drop.prevent="onDrop"
            >
              <span class="inline-flex rounded-md border border-default px-3 py-1.5 text-sm font-medium bg-default">
                Upload new
              </span>
              <span class="text-sm text-muted">Accepts images up to 8MB. Drag to reorder once uploaded.</span>
              <input
                type="file"
                accept="image/*"
                multiple
                class="sr-only"
                @change="onFileInput"
              >
            </label>
          </UFormField>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold">
              Affiliate link
            </h2>
          </template>

          <div class="space-y-4">
            <UFormField
              label="Retailer"
              name="retailer"
              help="The store this product links to"
            >
              <UInput
                v-model="state.retailer"
                placeholder="Amazon"
                icon="i-heroicons-building-storefront"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Price"
              name="price"
              help="Optional. Shown as a guide; the retailer's price may change."
            >
              <UInputNumber
                v-model="state.price"
                :min="0"
                :step="0.01"
                :format-options="{ style: 'currency', currency: CURRENCY }"
                :locale="LOCALE"
                placeholder="£0.00"
                class="w-full sm:w-48"
              />
            </UFormField>

            <UFormField
              label="Affiliate URL"
              name="affiliateUrl"
            >
              <div class="flex gap-2">
                <UInput
                  v-model="state.affiliateUrl"
                  type="url"
                  placeholder="https://"
                  icon="i-heroicons-link"
                  class="flex-1"
                />
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-heroicons-arrow-top-right-on-square"
                  :to="isHttpUrl(state.affiliateUrl) ? state.affiliateUrl : undefined"
                  :disabled="!isHttpUrl(state.affiliateUrl)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Test link
                </UButton>
              </div>
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold">
                Search engine listing
              </h2>
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
            Add a title and description to see how this product might appear in a search engine listing.
          </p>

          <div
            v-show="seoOpen"
            class="mt-4 pt-4 border-t border-default space-y-4"
          >
            <UFormField
              label="Page title"
              name="seoTitle"
              :hint="`${(state.seoTitle ?? '').length} of 70 characters used`"
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
              :hint="`${(state.seoDescription ?? '').length} of 320 characters used`"
            >
              <UTextarea
                v-model="state.seoDescription"
                :placeholder="plainDescription.slice(0, 320)"
                :rows="3"
                autoresize
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="URL handle"
              name="handle"
              :help="`${urlPrefix}${state.handle}`"
            >
              <UInput
                v-model="state.handle"
                class="w-full"
                @update:model-value="handleTouched = true"
              />
            </UFormField>
          </div>
        </UCard>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <UCard v-if="featured">
          <template #header>
            <h2 class="text-sm font-semibold">
              Preview
            </h2>
          </template>

          <div class="space-y-3">
            <div class="aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                :src="featured.previewUrl"
                :alt="featured.alt"
                class="size-full object-cover"
              >
            </div>
            <div>
              <p class="font-medium truncate">
                {{ state.title || "Untitled product" }}
              </p>
              <p class="text-sm text-muted truncate">
                {{ state.retailer || "No retailer yet" }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <CoreButtonBar
      :show="isDirty || saving"
      :message="saveBarMessage"
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
        :disabled="isUploading || hasFailedUploads"
      >
        Save
      </UButton>
    </CoreButtonBar>
  </UForm>
</template>

<script setup lang="ts">
import type { EditorToolbarItem, FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";
import type { z } from "#shared/schemas/zod";
import { addProductSchema } from "#shared/schemas/products.schema";
import type { EditableProduct } from "#shared/types/product";

type Schema = z.output<typeof addProductSchema>;

const { product } = defineProps<{
  product?: EditableProduct;
}>();

const emit = defineEmits<{
  saved: [product: EditableProduct];
}>();

const SEO_FIELDS = ["handle", "seoTitle", "seoDescription"];

const toast = useToast();
const form = useTemplateRef("form");
const requestUrl = useRequestURL();

const toState = (product?: EditableProduct) => ({
  title: product?.title ?? "",
  description: product?.description ?? "",
  handle: product?.handle ?? "",
  price: product?.pricePence == null ? null : product.pricePence / 100,
  retailer: product?.retailer ?? "",
  affiliateUrl: product?.affiliateUrl ?? "",
  seoTitle: product?.seoTitle ?? "",
  seoDescription: product?.seoDescription ?? "",
  images: (product?.images ?? []).map(image => ({ ...image })) as { url: string; alt?: string | null }[],
});

const state = reactive(toState(product));
const {
  media,
  dragIndex,
  dropActive,
  isUploading,
  hasFailedUploads,
  uploadedImages,
  featured,
  onFileInput,
  onDrop,
  remove,
  moveTo,
  reset: resetMedia,
} = useProductMedia(product?.images);
const saving = ref(false);
const seoOpen = ref(false);
// When editing, keep the saved handle rather than re-deriving it from the title
const handleTouched = ref(!!product);

watch(uploadedImages, (images) => {
  state.images = images;
});

// Auto-fill the handle from the title until the user edits it themselves.
watch(() => state.title, (title) => {
  if (!handleTouched.value) state.handle = slugify(title);
});

const plainDescription = computed(() => htmlToText(state.description));

// Everything the user can change, normalised so it can be compared with the last saved version
const snapshot = () => JSON.stringify({
  title: state.title.trim(),
  description: htmlToText(state.description) ? state.description : "",
  handle: state.handle,
  price: state.price ?? null,
  retailer: state.retailer.trim(),
  affiliateUrl: state.affiliateUrl.trim(),
  seoTitle: state.seoTitle.trim(),
  seoDescription: state.seoDescription.trim(),
  media: media.value.map(item => [item.url ?? item.key, item.alt.trim()]),
});

const savedSnapshot = ref(snapshot());
const isDirty = computed(() => snapshot() !== savedSnapshot.value);

const saveBarMessage = computed(() => {
  if (hasFailedUploads.value) return "Remove failed uploads before saving";
  return product ? "Unsaved changes" : "Unsaved product";
});

const urlPrefix = computed(() => `${requestUrl.host}/products/`);

const seoPreview = computed(() => ({
  title: state.seoTitle || state.title,
  description: state.seoDescription || plainDescription.value.slice(0, 320),
  url: `${requestUrl.origin}/products/${state.handle || slugify(state.title)}`,
}));

const toolbarItems: EditorToolbarItem[][] = [
  [
    { kind: "heading", level: 2, icon: "i-lucide-heading-2", tooltip: { text: "Heading" } },
    { kind: "heading", level: 3, icon: "i-lucide-heading-3", tooltip: { text: "Subheading" } },
  ],
  [
    { kind: "mark", mark: "bold", icon: "i-lucide-bold", tooltip: { text: "Bold" } },
    { kind: "mark", mark: "italic", icon: "i-lucide-italic", tooltip: { text: "Italic" } },
    { kind: "mark", mark: "underline", icon: "i-lucide-underline", tooltip: { text: "Underline" } },
  ],
  [
    { kind: "bulletList", icon: "i-lucide-list", tooltip: { text: "Bullet list" } },
    { kind: "orderedList", icon: "i-lucide-list-ordered", tooltip: { text: "Numbered list" } },
    { kind: "blockquote", icon: "i-lucide-text-quote", tooltip: { text: "Quote" } },
  ],
  [
    { kind: "link", icon: "i-lucide-link", tooltip: { text: "Link" } },
    { kind: "clearFormatting", icon: "i-lucide-remove-formatting", tooltip: { text: "Clear formatting" } },
  ],
];

function htmlToText(html: string | null | undefined) {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function isHttpUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\/\S+\.\S+/.test(value);
}

function reset(product?: EditableProduct) {
  resetMedia(product?.images);
  Object.assign(state, toState(product));
  handleTouched.value = !!product;
  form.value?.clear();
  savedSnapshot.value = snapshot();
}

function cancel() {
  reset(product);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isUploading.value || hasFailedUploads.value) return;

  const body = {
    ...event.data,
    description: plainDescription.value ? event.data.description : null,
  };

  saving.value = true;
  try {
    if (product) {
      const { data } = await $fetch(`/api/products/${product.id}`, { method: "PATCH", body });
      toast.add({ title: "Product saved", color: "success" });
      if (data) {
        reset(data);
        emit("saved", data);
      }
    } else {
      await $fetch("/api/products", { method: "POST", body });
      toast.add({ title: "Product saved", color: "success" });
      savedSnapshot.value = snapshot();
      await navigateTo("/admin/products");
    }
  } catch (error) {
    const apiError = getApiError(error);
    const fieldErrors = toFormErrors(apiError.fieldErrors);

    if (fieldErrors.length) {
      if (fieldErrors.some(fieldError => SEO_FIELDS.includes(fieldError.name ?? ""))) seoOpen.value = true;
      form.value?.setErrors(fieldErrors);
    }

    toast.add({ title: "Couldn't save product", description: apiError.message, color: "error" });
  } finally {
    saving.value = false;
  }
}

function onError(event: FormErrorEvent) {
  if (event.errors.some(error => SEO_FIELDS.includes(error.name ?? ""))) {
    seoOpen.value = true;
  }
}
</script>
