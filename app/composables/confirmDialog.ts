import { CoreConfirmDialog } from "#components";

export interface ConfirmOptions {
  title: string;
  description?: string;
  question?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: "primary" | "error" | "warning" | "neutral";
}

export function useConfirmDialog() {
  const overlay = useOverlay();
  const dialog = overlay.create(CoreConfirmDialog);

  // Esc and clicking outside close the dialog without a value, so only an explicit confirm is true
  async function confirm(options: ConfirmOptions): Promise<boolean> {
    const confirmed = await dialog.open(options);
    return confirmed === true;
  }

  return { confirm };
}
