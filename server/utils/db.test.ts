import { describe, expect, it } from "vitest";
import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { isUniqueViolation, rethrowUniqueViolationAs } from "./db";

describe("isUniqueViolation", () => {
  it("spots Postgres code 23505 directly or wrapped in causes", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { cause: { code: "23505" } } })).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("rethrowUniqueViolationAs", () => {
  const handler = rethrowUniqueViolationAs("handle", "Already used");

  it("turns a unique violation into a conflict on the field", () => {
    let error: H3Error<ApiError> | undefined;
    try {
      handler({ cause: { code: "23505" } });
    } catch (caught) {
      error = caught as H3Error<ApiError>;
    }

    expect(error?.statusCode).toBe(409);
    expect(error?.data).toMatchObject({ code: "CONFLICT", message: "Already used", fieldErrors: { handle: ["Already used"] } });
  });

  it("rethrows any other error unchanged", () => {
    const original = new Error("connection lost");
    expect(() => handler(original)).toThrow(original);
  });
});
