import { describe, expect, it } from "vitest";
import type { UserRow } from "hub:db:schema";
import { toSessionUser } from "./auth";

describe("toSessionUser", () => {
  it("keeps only what the session needs, never the password", () => {
    const row = { id: "u1", username: "admin", role: "admin", password: "hashed-secret" } as unknown as UserRow;
    expect(toSessionUser(row)).toEqual({ id: "u1", username: "admin", role: "admin" });
  });
});
