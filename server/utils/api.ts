import type { H3Event } from "h3";
import type { ZodType } from "zod";
import { z } from "#shared/schemas/zod";
import { apiErrorStatus, isApiError, type ApiError, type ApiErrorCode, type ApiFieldErrors, type ApiSuccess } from "#shared/types/api";

export function ok<T>(data: T, message?: string): ApiSuccess<T> {
  return message ? { success: true, data, message } : { success: true, data };
}

/** Builds an error to `throw` from inside a `defineApiHandler` handler. */
export function apiError(code: ApiErrorCode, message: string, fieldErrors?: ApiFieldErrors) {
  return createError({
    statusCode: apiErrorStatus[code],
    statusMessage: message,
    data: { success: false, code, message, fieldErrors } satisfies ApiError,
  });
}

export const badRequest = (message = "Something about that request wasn't right") => apiError("BAD_REQUEST", message);

export const unauthorized = (message = "Please log in to continue") => apiError("UNAUTHORIZED", message);

export const forbidden = (message = "You don't have permission to do that") => apiError("FORBIDDEN", message);

export const notFound = (message = "We couldn't find what you were looking for") => apiError("NOT_FOUND", message);

export const conflict = (message = "That already exists") => apiError("CONFLICT", message);

export function validationError(error: z.ZodError) {
  const { formErrors, fieldErrors } = z.flattenError(error);

  const cleanFieldErrors = Object.fromEntries(
    Object.entries(fieldErrors as Record<string, string[] | undefined>).filter((entry): entry is [string, string[]] => !!entry[1]?.length)
  );

  return apiError("VALIDATION_ERROR", formErrors[0] ?? "Please check the highlighted fields and try again", cleanFieldErrors);
}

/** Reads the JSON body and validates it, throwing a `VALIDATION_ERROR` on failure. */
export async function readValidated<S extends ZodType>(event: H3Event, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await readBody(event);
  } catch {
    throw badRequest("The request body isn't valid JSON");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw validationError(result.error);
  }

  return result.data;
}

/** Validates the query string, throwing a `VALIDATION_ERROR` on failure. */
export function readValidatedQuery<S extends ZodType>(event: H3Event, schema: S): z.output<S> {
  const result = schema.safeParse(getQuery(event));
  if (!result.success) {
    throw validationError(result.error);
  }

  return result.data;
}

/** Reads the `id` route param, throwing `notFoundError()` unless it's a UUID. */
export function readIdParam(event: H3Event, notFoundError: () => Error): string {
  const result = z.object({ id: z.uuid() }).safeParse(getRouterParams(event));
  if (!result.success) {
    throw notFoundError();
  }

  return result.data.id;
}

const codeForStatus = (status: number): ApiErrorCode => {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST";
  }
};

function toApiError(error: unknown): { status: number; body: ApiError } {
  if (isError(error)) {
    if (isApiError(error.data)) {
      return { status: error.statusCode, body: error.data };
    }

    // Errors thrown by h3 or modules (e.g. requireUserSession) rather than our helpers
    if (error.statusCode < 500) {
      return {
        status: error.statusCode,
        body: {
          success: false,
          code: codeForStatus(error.statusCode),
          message: error.statusMessage || error.message,
        },
      };
    }
  }

  console.error("[api] Unhandled error", error);

  return {
    status: 500,
    body: {
      success: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong on our side. Please try again.",
    },
  };
}

/**
 * Wraps an API route so every response is either `ApiSuccess<T>` or `ApiError`.
 * Throw `apiError(...)` (or one of the helpers above) to fail with a specific code.
 */
export function defineApiHandler<T>(handler: (event: H3Event) => Promise<ApiSuccess<T>>) {
  return defineEventHandler(async (event): Promise<ApiSuccess<T>> => {
    try {
      return await handler(event);
    } catch (error) {
      const { status, body } = toApiError(error);
      setResponseStatus(event, status);
      // Returned rather than re-thrown so the body is exactly `ApiError` instead of
      // Nitro's error wrapper. Typed as success because `$fetch` rejects on non-2xx.
      return body as never;
    }
  });
}
