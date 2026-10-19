<template>
  <UCard>
    <template #header>
      <h2 class="text-sm font-semibold">Preview</h2>
    </template>

    <p
      v-if="!rules"
      class="text-sm text-muted"
    >
      Finish the conditions to see which products match.
    </p>

    <CoreAlert
      v-else-if="errorMessage"
      variant="error"
      title="Couldn't load the preview"
      :description="errorMessage"
    />

    <div
      v-else-if="result"
      class="space-y-4"
      :class="{ 'opacity-60': loading }"
      :aria-busy="loading"
    >
      <div class="space-y-1">
        <p
          class="font-medium text-highlighted"
          role="status"
        >
          {{ result.total }} {{ result.total === 1 ? "product matches" : "products match" }}
        </p>
        <p class="text-sm text-muted">{{ summary }}</p>
      </div>

      <ul
        v-if="result.items.length"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        aria-label="Matching products"
      >
        <li
          v-for="product in result.items"
          :key="product.id"
        >
          <ProductCard :product="product" />
        </li>
      </ul>
      <p
        v-if="result.total > result.items.length"
        class="text-sm text-muted"
      >
        and {{ result.total - result.items.length }} more
      </p>
    </div>

    <p
      v-else
      class="text-sm text-muted"
      role="status"
    >
      Loading the matching products…
    </p>
  </UCard>
</template>

<script setup lang="ts">
import type { ApiSuccess } from "#shared/types/api";
import type { CollectionPreview, ProductSort } from "#shared/types/collection";
import type { CollectionRules } from "#shared/types/collectionRules";

const { rules, sort } = defineProps<{
  /** Only valid rules: pass `null` while they are incomplete. */
  rules: CollectionRules | null;
  sort: ProductSort;
}>();

const { tags } = useTags();

const result = ref<CollectionPreview | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);
// Only the newest request may update the card, so a slow earlier one can't overwrite it
let latest = 0;
// A debounced change can still fire after the page is left
let unmounted = false;
onBeforeUnmount(() => {
  unmounted = true;
});

const summary = computed(() => (rules ? describeRules(rules, new Map(tags.value.map(tag => [tag.id, tag.name]))) : ""));

async function load() {
  const request = ++latest;
  if (unmounted) return;
  if (!rules) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const { data } = await $fetch<ApiSuccess<CollectionPreview>>("/api/collections/preview", { method: "POST", body: { rules, sort } });
    if (request !== latest) return;
    result.value = data;
    errorMessage.value = null;
  } catch (error) {
    if (request !== latest) return;
    errorMessage.value = getApiError(error).message;
  } finally {
    if (request === latest) loading.value = false;
  }
}

// The last result stays on screen while the next loads
watchDebounced(() => [rules && JSON.stringify(rules), sort], load, { debounce: 400 });
onMounted(load);
</script>
