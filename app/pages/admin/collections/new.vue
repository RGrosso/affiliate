<template>
  <AdminContainer heading="Add collection">
    <template #actions>
      <UButton
        to="/admin/collections"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
      >
        Collections
      </UButton>
    </template>

    <CollectionForm />
  </AdminContainer>
</template>
