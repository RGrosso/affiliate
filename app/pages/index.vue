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
        <div class="flex flex-wrap justify-between items-end gap-3">
          <div>
            <h2 class="text-3xl sm:text-4xl">
              Trending right now
            </h2>
            <p class="mt-1">
              From mildly useful to absolutely bonkers.
            </p>
          </div>
          <UButton
            to="/products"
            label="View all"
            variant="link"
            trailing-icon="i-heroicons-arrow-right"
            class="font-bold"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <template v-if="status === 'pending'">
            <UCard
              v-for="i in FEATURED_COUNT"
              :key="i"
              :ui="{ body: 'p-3 sm:p-3 space-y-3' }"
            >
              <USkeleton class="aspect-square rounded-sm" />
              <USkeleton class="h-5 w-3/4" />
              <USkeleton class="h-4 w-1/3" />
            </UCard>
          </template>

          <ProductCard
            v-for="product in featured"
            v-else
            :key="product.id"
            :product="product"
          />
        </div>

        <p
          v-if="status !== 'pending' && !featured.length"
          class="text-center py-12"
        >
          {{ error ? "We couldn't load products right now. Please try again later." : "New finds are on the way. Check back soon!" }}
        </p>
        <p
          v-if="featured.length"
          class="text-sm text-dimmed"
        >
          We may earn a commission, at no cost to you.
        </p>
      </section>
    </CoreContainer>
  </div>
</template>

<script setup lang="ts">
const FEATURED_COUNT = 8;

const { data, status, error } = await useFetch("/api/products", {
  query: { limit: FEATURED_COUNT },
  lazy: true,
});

const featured = computed(() => data.value?.data.products ?? []);
</script>
