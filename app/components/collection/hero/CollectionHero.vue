<template>
  <CoreContainer
    variant="full"
    as="section"
    class="relative isolate overflow-hidden bg-band text-white"
  >
    <template v-if="collection.imageUrl">
      <img
        :src="collection.imageUrl"
        :alt="collection.imageAlt ?? ''"
        class="absolute inset-0 -z-20 size-full object-cover"
      />
      <!-- Navy at the bottom left fades out, so the title stays legible over any photo -->
      <div
        data-scrim
        class="absolute inset-0 -z-10 bg-linear-to-tr from-band from-15% via-band/60 via-45% to-transparent"
      />
    </template>

    <CoreRibbon
      v-if="collection.isDraft"
      label="Preview"
    />

    <div class="flex h-70 flex-col justify-end gap-3 pb-8 lg:h-95 lg:pb-12">
      <h1 class="max-w-3xl text-3xl text-white sm:text-5xl">{{ collection.title }}</h1>
      <p
        v-if="collection.description"
        class="max-w-2xl whitespace-pre-line text-band-muted sm:text-lg"
      >
        {{ collection.description }}
      </p>
    </div>
  </CoreContainer>
</template>

<script setup lang="ts">
import type { PublicCollection } from "#shared/types/collection";

defineProps<{
  collection: Pick<PublicCollection, "title" | "description" | "imageUrl" | "imageAlt" | "isDraft">;
}>();
</script>
