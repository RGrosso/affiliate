<template>
  <div>
    <section class="py-20 sm:py-32 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <UContainer>
        <div class="flex flex-col items-center text-center bg-">
          <UBadge
            label="Hand-picked for you & your pets"
            variant="soft"
            color="primary"
            class="mb-4"
          />
          <h1 class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            Gifts for <span class="text-primary">Every Member</span> of the Family
          </h1>
          <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400 max-w-2xl">
            Stop scrolling endlessly. We've curated the highest-rated toys, treats, and essentials
            for people and their furry friends, so you don't have to.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <UButton
              to="/products"
              size="xl"
              label="Shop Now"
              icon="i-heroicons-chevron-right"
              trailing
            />
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-20">
      <UContainer>
        <div class="flex justify-between items-end mb-12">
          <div>
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
              Featured Finds
            </h2>
            <p class="text-gray-500 mt-2">
              Latest additions to our collection.
            </p>
          </div>
          <UButton
            variant="link"
            to="/products"
            label="View all products"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <template v-if="status === 'pending'">
            <UCard
              v-for="i in FEATURED_COUNT"
              :key="i"
              class="overflow-hidden"
              :ui="{ header: 'p-0 sm:p-0' }"
            >
              <template #header>
                <div class="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse flex items-center justify-center">
                  <UIcon
                    name="i-heroicons-photo"
                    class="w-12 h-12 text-gray-400"
                  />
                </div>
              </template>
              <div class="space-y-2">
                <div class="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div class="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <template #footer>
                <div class="flex justify-between items-center">
                  <div class="h-6 w-16 bg-primary-100 dark:bg-primary-900 rounded animate-pulse" />
                  <div class="h-8 w-24 bg-primary-100 dark:bg-primary-900 rounded animate-pulse" />
                </div>
              </template>
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
          class="text-center text-gray-500 py-12"
        >
          {{ error ? "We couldn't load products right now. Please try again later." : "New finds are on the way. Check back soon!" }}
        </p>
      </UContainer>
    </section>
  </div>
</template>

<script setup lang="ts">
const FEATURED_COUNT = 6;

const { data, status, error } = await useFetch("/api/products", {
  query: { limit: FEATURED_COUNT },
  lazy: true,
});

const featured = computed(() => data.value?.data.products ?? []);
</script>
