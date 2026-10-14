<template>
  <AdminContainer heading="Add tag">
    <template #actions>
      <UButton
        to="/admin/tags"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
      >
        Tags
      </UButton>
    </template>

    <TagForm @saved="onSaved" />
  </AdminContainer>
</template>

<script setup lang="ts">
import type { Tag } from "#shared/types/tag";

const toast = useToast();

// The form is clean once saved, so leaving for the new tag's page doesn't prompt
async function onSaved(tag: Tag) {
  toast.add({ title: "Tag added", description: `"${tag.name}" was added.`, color: "success" });
  await navigateTo(`/admin/tags/${tag.id}`);
}
</script>
