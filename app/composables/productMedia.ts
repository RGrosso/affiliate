import type { ProductImage } from "#shared/types/product";

export type MediaItem = {
  key: string;
  previewUrl: string;
  url?: string;
  alt: string;
  status: "uploading" | "done" | "error";
};

export const MAX_PRODUCT_IMAGES = 10;

const toMedia = (images: ProductImage[] = []): MediaItem[] =>
  images.map(image => ({
    key: image.url,
    previewUrl: image.url,
    url: image.url,
    alt: image.alt ?? "",
    status: "done",
  }));

const revokePreview = (item: MediaItem) => {
  if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
};

/** Product images being edited: uploads (cropped to square), alt text, removal and drag-to-reorder. */
export function useProductMedia(initial?: ProductImage[]) {
  const toast = useToast();

  const media = ref<MediaItem[]>(toMedia(initial));
  const dragIndex = ref<number | null>(null);
  const dropActive = ref(false);

  const isUploading = computed(() => media.value.some(item => item.status === "uploading"));
  const hasFailedUploads = computed(() => media.value.some(item => item.status === "error"));
  const uploadedImages = computed<ProductImage[]>(() =>
    media.value.filter(item => item.status === "done" && item.url).map(item => ({ url: item.url!, alt: item.alt.trim() || null }))
  );
  // The first uploaded image is the one saved as featured
  const featured = computed(() => media.value.find(item => item.status === "done"));

  async function upload(file: File) {
    const item = reactive<MediaItem>({
      key: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      alt: "",
      status: "uploading",
    });
    media.value.push(item);

    try {
      const square = await cropToSquare(file);
      revokePreview(item);
      item.previewUrl = URL.createObjectURL(square);

      const body = new FormData();
      body.append("file", square);
      const { data } = await $fetch("/api/products/images", { method: "POST", body });

      item.url = data.url;
      item.status = "done";
    } catch (error) {
      item.status = "error";
      toast.add({ title: `Couldn't upload ${file.name}`, description: getApiError(error).message, color: "error" });
    }
  }

  function addFiles(files: File[]) {
    const images = files.filter(file => file.type.startsWith("image/"));
    const available = MAX_PRODUCT_IMAGES - media.value.length;

    if (images.length > available) {
      toast.add({ title: `You can add up to ${MAX_PRODUCT_IMAGES} images`, color: "warning" });
    }

    images.slice(0, available).forEach(upload);
  }

  function onFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    addFiles(Array.from(input.files ?? []));
    input.value = "";
  }

  function onDrop(event: DragEvent) {
    dropActive.value = false;
    // A drop while reordering is handled by moveTo, not as new files
    if (dragIndex.value !== null) return;
    addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  function remove(index: number) {
    const [removed] = media.value.splice(index, 1);
    if (removed) revokePreview(removed);
  }

  function moveTo(targetIndex: number) {
    const from = dragIndex.value;
    dragIndex.value = null;
    if (from === null || from === targetIndex) return;

    const [moved] = media.value.splice(from, 1);
    media.value.splice(targetIndex, 0, moved!);
  }

  function reset(images?: ProductImage[]) {
    media.value.forEach(revokePreview);
    media.value = toMedia(images);
  }

  return {
    media,
    dragIndex,
    dropActive,
    isUploading,
    hasFailedUploads,
    uploadedImages,
    featured,
    onFileInput,
    onDrop,
    remove,
    moveTo,
    reset,
  };
}
