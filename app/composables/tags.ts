import type { ApiSuccess } from "#shared/types/api";
import type { AdminTag, Tag } from "#shared/types/tag";
import type { UpdateTagInput } from "#shared/schemas/tags.schema";

/**
 * The admin's tags, shared by every caller through one fetch key, so a tag added from the product
 * form shows on the Tags page without a reload. Mutations refresh the list; errors are thrown for
 * the caller to show (see `getApiError`).
 */
export function useTags() {
  const { data, status, error, refresh } = useFetch<ApiSuccess<AdminTag[]>>("/api/tags", {
    key: "admin-tags",
  });

  const tags = computed(() => data.value?.data ?? []);

  // The shared list is reused on client-side navigation, so product counts changed by saving a
  // product would never reload. Hydration keeps the server's copy to avoid a mismatch.
  const nuxtApp = useNuxtApp();
  onMounted(() => {
    if (!nuxtApp.isHydrating) refresh();
  });

  async function create(name: string): Promise<Tag> {
    const { data: tag } = await $fetch<ApiSuccess<Tag>>("/api/tags", { method: "POST", body: { name } });
    await refresh();
    return tag;
  }

  async function update(id: string, input: UpdateTagInput): Promise<Tag> {
    const { data: tag } = await $fetch<ApiSuccess<Tag>>(`/api/tags/${id}`, { method: "PATCH", body: input });
    await refresh();
    return tag;
  }

  async function remove(id: string) {
    await $fetch(`/api/tags/${id}`, { method: "DELETE" });
    await refresh();
  }

  return { tags, status, error, refresh, create, update, remove };
}
