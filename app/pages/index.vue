<template>
  <div>
    <CoreContainer
      variant="full"
      as="section"
      class="bg-band text-white"
    >
      <div class="py-12 sm:py-16 grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
        <div class="flex flex-col items-start gap-5">
          <span class="rounded-md bg-secondary-100 text-secondary-900 text-sm font-bold px-3 py-1.5">
            No idea what to get? Same.
          </span>
          <h1 class="text-4xl sm:text-6xl leading-[0.98]">
            Gifts for people (and pets) who are impossible to buy for
          </h1>
          <p class="text-lg text-band-muted max-w-xl">
            Silly, clever and genuinely good presents, hand-picked from shops across the internet.
          </p>
          <UButton
            to="/products"
            label="Browse"
            color="action"
            size="xl"
            class="font-bold px-10 py-3.5"
          />
        </div>
        <img
          src="/images/hero.svg"
          alt="A pile of wrapped presents with a paw print and confetti"
          width="480"
          height="400"
          class="w-full max-w-md mx-auto"
        >
      </div>
    </CoreContainer>

    <CoreContainer variant="padded">
      <section class="space-y-5">
        <ProductRow
          label="Trending right now"
          :products="items"
          :loading="status === 'pending'"
          :loading-more="loadingMore"
          :can-load-more="canLoadMore"
          :view-all-to="VIEW_ALL"
          @load-more="loadMore"
        >
          <template #header>
            <div>
              <h2 class="text-3xl sm:text-4xl">
                Trending right now
              </h2>
              <p class="mt-1">
                From mildly useful to absolutely bonkers.
              </p>
            </div>
          </template>
          <template #actions>
            <UButton
              :to="VIEW_ALL"
              label="View all"
              variant="link"
              trailing-icon="i-heroicons-arrow-right"
              class="font-bold"
            />
          </template>
        </ProductRow>

        <p
          v-if="status !== 'pending' && !items.length"
          class="text-center py-12"
        >
          {{ error ? "We couldn't load products right now. Please try again later." : "New finds are on the way. Check back soon!" }}
        </p>
        <p
          v-if="items.length"
          class="text-sm text-dimmed"
        >
          We may earn a commission, at no cost to you.
        </p>
      </section>
    </CoreContainer>
  </div>
</template>

<script setup lang="ts">
import type { ProductListItem } from "#shared/types/product";

// Collections don't exist yet; this placeholder is where "View all" will lead
const VIEW_ALL = "/collections/all";

const { items, status, error, loadingMore, canLoadMore, loadMore } = await useLoadMore<ProductListItem>("/api/products", { pageSize: 10, maxPages: 2 });
</script>
