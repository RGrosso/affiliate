/**
 * Every `/api` route responds with one of these shapes, so the client can
 * handle success and failure the same way regardless of the endpoint.
 */

export type ApiErrorCode
  = | "BAD_REQUEST"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "INVALID_CREDENTIALS"
    | "SETUP_REQUIRED"
    | "ACCOUNT_DISABLED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL_ERROR";

export const apiErrorStatus: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  SETUP_REQUIRED: 403,
  ACCOUNT_DISABLED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export type ApiFieldErrors = Record<string, string[]>;

export type ApiSuccess<T = null> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  code: ApiErrorCode;
  message: string;
  /** Per-field validation messages, keyed by the field name. */
  fieldErrors?: ApiFieldErrors;
};

export type ApiResponse<T = null> = ApiSuccess<T> | ApiError;

export function isApiError(value: unknown): value is ApiError {
  return typeof value === "object"
    && value !== null
    && (value as ApiError).success === false
    && typeof (value as ApiError).code === "string";
}
