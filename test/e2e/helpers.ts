import type { Page } from "@playwright/test";

/** The visible toasts. Toast text is also copied into a hidden alert for screen readers, so don't use getByText. */
export const toasts = (page: Page) => page.getByRole("region", { name: /Notifications/ }).getByRole("listitem");
