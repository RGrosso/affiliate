<template>
  <CoreContainer
    v-if="product"
    variant="padded"
  >
    <UBreadcrumb
      :items="breadcrumbs"
      separator-icon="i-lucide-chevron-right"
      :ui="{
        list: 'gap-2.5',
        link: 'text-xs font-normal text-muted hover:text-default',
        separatorIcon: 'size-3 text-dimmed',
      }"
      class="mb-6"
    />

    <div class="grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
      <ProductGallery
        :images="product.images"
        :title="product.title"
      />

      <div class="flex flex-col gap-5">
        <div
          v-if="product.isSample || product.tags.length"
          class="flex flex-wrap gap-1.5"
        >
          <CoreTag
            v-if="product.isSample"
            label="Sample"
            color="warning"
          />
          <CoreTag
            v-for="tag in product.tags"
            :key="tag.id"
            :label="tag.name"
            :icon="tag.icon"
            :tooltip="tag.tooltip"
          />
        </div>

        <div class="space-y-2">
          <h1 class="text-3xl sm:text-4xl text-highlighted">
            {{ product.title }}
          </h1>
          <p
            v-if="product.brand"
            class="text-toned"
          >
            by {{ product.brand }}
          </p>
        </div>

        <p
          v-if="product.pricePence != null"
          class="font-display font-bold text-3xl text-highlighted"
        >
          {{ formatCurrency(product.pricePence) }}
        </p>

        <div
          v-if="product.affiliateUrl"
          class="space-y-2 pt-2 border-t border-default"
        >
          <UButton
            :to="product.affiliateUrl"
            target="_blank"
            rel="sponsored noopener noreferrer"
            color="action"
            size="xl"
            block
            trailing-icon="i-heroicons-arrow-top-right-on-square"
            class="font-bold py-3.5 mt-3"
          >
            {{ product.retailer ? `Buy at ${product.retailer}` : "Buy now" }}
          </UButton>
          <p class="text-sm text-dimmed">
            We may earn a commission, at no cost to you.
          </p>
        </div>

        <section
          v-if="product.description"
          aria-labelledby="description-heading"
          class="pt-5 border-t border-default space-y-3"
        >
          <h2
            id="description-heading"
            class="text-2xl"
          >
            Description
          </h2>
          <!-- Safe: the API sanitises the description with `sanitiseRichText` -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            :class="RICH_TEXT_CLASS"
            v-html="product.description"
          />
          <!-- eslint-enable vue/no-v-html -->
        </section>
      </div>
    </div>
  </CoreContainer>
</template>

<script setup lang="ts">
import type { BreadcrumbItem } from "@nuxt/ui";

// Styles the elements the description editor can produce
const RICH_TEXT_CLASS = [
  "space-y-3 text-muted",
  "[&_:is(h1,h2)]:text-xl [&_:is(h3,h4)]:text-lg [&_:is(h1,h2,h3,h4)]:text-highlighted",
  "[&_ul]:list-disc [&_ol]:list-decimal [&_:is(ul,ol)]:pl-5 [&_:is(ul,ol)]:space-y-1",
  "[&_blockquote]:border-l-4 [&_blockquote]:border-default [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_a]:text-primary [&_a]:underline [&_:is(strong,b)]:font-semibold [&_:is(strong,b)]:text-default",
];

const route = useRoute();
const handle = computed(() => String(route.params.handle));

const { data, error } = await useFetch(() => `/api/products/handle/${handle.value}`);

if (error.value) {
  const statusCode = error.value.statusCode ?? 500;
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? "We couldn't find that product" : "We couldn't load this product",
    fatal: true,
  });
}

const product = computed(() => data.value?.data);

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: "Home", to: "/" },
  { label: "All products", to: "/collections/all" },
  { label: product.value?.title ?? "", class: "text-toned" },
]);

const metaDescription = computed(() =>
  product.value?.seoDescription || htmlToText(product.value?.description).slice(0, 160) || undefined
);

useSeoMeta({
  title: () => product.value?.seoTitle || product.value?.title,
  description: metaDescription,
  ogTitle: () => product.value?.seoTitle || product.value?.title,
  ogDescription: metaDescription,
  ogImage: () => product.value?.images[0]?.url,
  ogType: "website",
});

useHead({
  script: [{
    type: "application/ld+json",
    // Escaping `<` stops a title or description from closing the script tag early
    innerHTML: () => product.value ? JSON.stringify(productJsonLd(product.value)).replace(/</g, "\\u003c") : "",
  }],
});
</script>
