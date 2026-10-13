import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { describe, expect, it } from "vitest";
import { rethrowAsDuplicateTag, toTagSlug } from "./tags";

const thrown = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error as H3Error<ApiError>;
  }
  throw new Error("Expected the function to throw");
};

describe("toTagSlug", () => {
  it("makes the same slug for names that differ only by case or spacing", () => {
    expect(toTagSlug("Air Fryers")).toBe("air-fryers");
    expect(toTagSlug("  air   fryers ")).toBe("air-fryers");
  });
});

describe("rethrowAsDuplicateTag", () => {
  it("turns a unique violation into a conflict on the name field", () => {
    const error = thrown(() => rethrowAsDuplicateTag({ cause: { code: "23505" } }));
    expect(error.statusCode).toBe(409);
    expect(error.data).toMatchObject({
      code: "CONFLICT",
      fieldErrors: { name: ["A tag with this name already exists"] },
    });
  });

  it("rethrows any other error unchanged", () => {
    const original = new Error("connection lost");
    expect(thrown(() => rethrowAsDuplicateTag(original))).toBe(original);
  });
});
