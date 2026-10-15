<template>
  <section
    :aria-label="`Images of ${title}`"
    tabindex="0"
    class="flex flex-col lg:flex-row gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    @keydown.left="show(current - 1)"
    @keydown.right="show(current + 1)"
  >
    <div class="relative order-1 lg:order-2 flex-1 aspect-square rounded-md bg-elevated overflow-hidden">
      <!-- Every image sits in one strip that slides along, so changing image animates between them -->
      <div
        v-if="images.length"
        class="flex size-full transition-transform duration-300 ease-out motion-reduce:transition-none"
        :style="{ transform: `translateX(-${current * 100}%)` }"
      >
        <img
          v-for="(image, index) in images"
          :key="`${index}-${image.url}`"
          :src="image.url"
          :alt="index === current ? image.alt ?? title : ''"
          :aria-hidden="index !== current"
          class="size-full shrink-0 object-cover"
          :fetchpriority="index === 0 ? 'high' : undefined"
          :data-main="index === current ? '' : undefined"
        >
      </div>
      <div
        v-else
        class="size-full flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-photo"
          class="w-16 h-16 text-dimmed"
        />
      </div>

      <template v-if="images.length > 1">
        <UButton
          icon="i-heroicons-chevron-left"
          color="neutral"
          variant="outline"
          size="xs"
          square
          :class="ARROW_CLASS"
          class="left-2"
          aria-label="Previous image"
          @click="show(current - 1)"
        />
        <UButton
          icon="i-heroicons-chevron-right"
          color="neutral"
          variant="outline"
          size="xs"
          square
          :class="ARROW_CLASS"
          class="right-2"
          aria-label="Next image"
          @click="show(current + 1)"
        />
        <p
          class="sr-only"
          aria-live="polite"
        >
          Image {{ current + 1 }} of {{ images.length }}
        </p>
      </template>
    </div>

    <ul
      v-if="images.length > 1"
      class="order-2 lg:order-1 flex lg:flex-col gap-2 overflow-x-auto p-1 -m-1 lg:overflow-visible [scrollbar-width:none]"
    >
      <li
        v-for="(image, index) in images"
        :key="`${index}-${image.url}`"
        class="shrink-0"
      >
        <button
          type="button"
          :aria-label="`Show image ${index + 1} of ${images.length}`"
          :aria-current="index === current"
          class="block size-16 lg:size-20 rounded-md overflow-hidden bg-elevated transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="index === current
            ? 'ring-2 ring-primary'
            : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100 focus-visible:grayscale-0 focus-visible:opacity-100'"
          @click="show(index)"
        >
          <img
            :src="image.url"
            alt=""
            class="size-full object-cover"
            loading="lazy"
          >
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { ProductImage } from "#shared/types/product";

const ARROW_CLASS = "absolute top-1/2 -translate-y-1/2 rounded-full bg-default/70 opacity-60 hover:opacity-100 focus-visible:opacity-100";

const { images, title } = defineProps<{
  images: ProductImage[];
  title: string;
}>();

const current = ref(0);

// Wraps round at both ends
function show(index: number) {
  if (!images.length) return;
  current.value = (index + images.length) % images.length;
}

watch(() => images, () => {
  current.value = 0;
});
</script>
