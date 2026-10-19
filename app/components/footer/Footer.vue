<template>
  <footer
    v-if="!hidden"
    class="mt-16 border-t border-default bg-muted"
  >
    <CoreContainer>
      <div class="py-10 grid gap-8 md:grid-cols-[1.5fr_1fr]">
        <div class="space-y-3 max-w-md">
          <NuxtLink
            to="/"
            class="inline-block font-display font-bold text-2xl tracking-tight text-primary"
          >
            {{ SITE_NAME }}<span class="text-action">.</span>
          </NuxtLink>
          <p>Gift ideas for humans, hounds and everything in between. Silly, clever and genuinely good presents, hand-picked from shops across the internet.</p>
        </div>

        <div class="md:justify-self-end md:max-w-xs">
          <p class="text-sm">We may earn a commission, at no cost to you.</p>
        </div>
      </div>

      <div class="py-5 border-t border-default text-sm text-muted">© {{ year }} {{ SITE_NAME }}. Prices and availability can change at the retailer.</div>
    </CoreContainer>
  </footer>
</template>

<script setup lang="ts">
const route = useRoute();
const hidden = computed(() => route.meta.hideFooter === true);

const year = formatYear(new Date());
</script>
