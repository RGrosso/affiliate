import type { User } from "#auth-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductService } from "../services/ProductService";
import { seedSampleProductsForAdmin } from "./seedSampleProducts";

const admin = { id: "u1", username: "admin", role: "admin" } as User;

const setup = (seedSamples: boolean) => {
  vi.stubGlobal("useRuntimeConfig", () => ({ seedSamples }));
  vi.stubGlobal("db", {});
  return vi.spyOn(ProductService.prototype, "seedSamplesOnce").mockResolvedValue(undefined);
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("seedSampleProductsForAdmin", () => {
  it("seeds for an admin when seedSamples is on", async () => {
    const seed = setup(true);
    await seedSampleProductsForAdmin(admin);
    expect(seed).toHaveBeenCalledWith("u1");
  });

  it("does nothing when seedSamples is off", async () => {
    const seed = setup(false);
    await seedSampleProductsForAdmin(admin);
    expect(seed).not.toHaveBeenCalled();
  });

  it("does nothing for a user who isn't an admin", async () => {
    const seed = setup(true);
    await seedSampleProductsForAdmin({ ...admin, role: "user" } as User);
    expect(seed).not.toHaveBeenCalled();
  });

  it("swallows a seeding failure so the login isn't blocked", async () => {
    const seed = setup(true);
    seed.mockRejectedValue(new Error("boom"));
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(seedSampleProductsForAdmin(admin)).resolves.toBeUndefined();
    expect(seed).toHaveBeenCalledWith("u1");
    expect(logError).toHaveBeenCalled();
  });
});
