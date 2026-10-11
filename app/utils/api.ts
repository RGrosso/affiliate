import type { FormError } from "@nuxt/ui";
import { isApiError, type ApiError, type ApiFieldErrors } from "#shared/types/api";

/** Turns anything thrown by `$fetch` into an `ApiError` the UI can display. */
export function getApiError(error: unknown): ApiError {
  const data = (error as { data?: unknown } | null)?.data;

  if (isApiError(data)) {
    return data;
  }

  return {
    success: false,
    code: "INTERNAL_ERROR",
    message: "We couldn't reach the server. Please check your connection and try again.",
  };
}

/** Maps API field errors onto `UForm`'s `setErrors()` format. */
export function toFormErrors(fieldErrors: ApiFieldErrors = {}): FormError[] {
  return Object.entries(fieldErrors)
    .filter(([, messages]) => messages.length > 0)
    .map(([name, messages]) => ({ name, message: messages[0]! }));
}
