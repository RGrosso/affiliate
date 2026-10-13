import { describe, expect, it } from "vitest";
import { z } from "#shared/schemas/zod";
import { apiError, notFound, ok, validationError } from "./api";

describe("ok", () => {
  it("wraps data, with an optional message", () => {
    expect(ok({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
    expect(ok(null, "Saved")).toEqual({ success: true, data: null, message: "Saved" });
  });
});

describe("apiError", () => {
  it("uses the status that matches the code and carries an ApiError body", () => {
    const error = apiError("SETUP_REQUIRED", "Finish setting up your account");
    expect(error.statusCode).toBe(403);
    expect(error.data).toEqual({
      success: false,
      code: "SETUP_REQUIRED",
      message: "Finish setting up your account",
      fieldErrors: undefined,
    });
  });

  it("has friendly default messages in its helpers", () => {
    expect(notFound().data?.message).toBe("We couldn't find what you were looking for");
  });
});

describe("validationError", () => {
  it("keeps only the fields that have messages", () => {
    const schema = z.object({ title: z.string().min(1, "Please give the product a title"), retailer: z.string() });
    const result = schema.safeParse({ title: "", retailer: "Shop" });
    const error = validationError(result.error!);

    expect(error.statusCode).toBe(400);
    expect(error.data).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Please check the highlighted fields and try again",
      fieldErrors: { title: ["Please give the product a title"] },
    });
  });

  it("uses a form-level message when there is one", () => {
    const schema = z.string().refine(() => false, "Something's not right");
    const error = validationError(schema.safeParse("x").error!);
    expect(error.data?.message).toBe("Something's not right");
  });
});
