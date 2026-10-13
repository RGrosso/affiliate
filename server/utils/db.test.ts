import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./db";

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
