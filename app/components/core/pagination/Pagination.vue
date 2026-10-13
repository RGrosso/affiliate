<template>
  <UPagination
    v-if="totalPages > 1"
    v-model:page="page"
    :total="total"
    :items-per-page="pageSize"
    color="neutral"
    variant="outline"
    active-color="primary"
    active-variant="solid"
    size="md"
  />
</template>

<script setup lang="ts">
const { total, pageSize } = defineProps<{
  total: number;
  pageSize: number;
}>();

const page = defineModel<number>("page", { default: 1 });

const totalPages = computed(() => totalPagesFor(total, pageSize));
</script>
