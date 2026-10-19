import { describe, expect, it } from "vitest";
import { z } from "./zod";
import { loginSchema, passwordSchema, setupPasswordSchema, usernameSchema } from "./auth.schema";

const messages = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map(issue => issue.message);
};

describe("usernameSchema", () => {
  it("accepts letters, numbers, hyphens and underscores", () => {
    expect(usernameSchema.parse("  gift_finder-1 ")).toBe("gift_finder-1");
  });

  it("explains each rule that fails", () => {
    expect(messages(usernameSchema, "")).toContain("Please enter a username");
    expect(messages(usernameSchema, "ab")).toContain("Your username needs to be at least 3 characters");
    expect(messages(usernameSchema, "a".repeat(21))).toContain("Your username can be at most 20 characters");
    expect(messages(usernameSchema, "no spaces")).toContain("Your username can only use letters, numbers, hyphens (-) and underscores (_)");
  });
});

describe("passwordSchema", () => {
  it("accepts a password that meets every rule", () => {
    expect(messages(passwordSchema, "Str0ng!pass")).toEqual([]);
  });

  it("lists every missing character type", () => {
    expect(messages(passwordSchema, "aaaaaaaa")).toEqual([
      "Add at least one capital letter (A–Z)",
      "Add at least one number (0–9)",
      "Add at least one symbol, such as ! @ # $ % or &",
    ]);
  });
});

describe("loginSchema", () => {
  it("only checks that both fields were entered", () => {
    expect(messages(loginSchema, { username: "admin", password: "x" })).toEqual([]);
    expect(messages(loginSchema, { username: " ", password: "" })).toEqual(["Please enter your username", "Please enter your password"]);
  });
});

describe("setupPasswordSchema", () => {
  it("flags mismatched passwords on the confirm field", () => {
    const result = setupPasswordSchema.safeParse({
      username: "admin",
      password: "Str0ng!pass",
      confirmPassword: "Str0ng!pas",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([expect.objectContaining({ message: "The passwords don't match", path: ["confirmPassword"] })]);
  });
});

describe("friendly fallback messages", () => {
  it("applies to rules that don't set their own message", () => {
    expect(messages(z.number(), "x")).toEqual(["Please enter a number"]);
    expect(messages(z.string(), undefined)).toEqual(["This field is required"]);
    expect(messages(z.string().max(3), "abcd")).toEqual(["Must be 3 characters or fewer"]);
    expect(messages(z.email(), "nope")).toEqual(["Please enter a valid email address"]);
  });
});
