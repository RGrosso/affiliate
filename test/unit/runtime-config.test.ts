import { fileURLToPath } from "node:url";
import { loadNuxtConfig } from "nuxt/kit";
import { describe, expect, it } from "vitest";

const cwd = fileURLToPath(new URL("../..", import.meta.url));

const seedSamplesFor = async (envName: string) => (await loadNuxtConfig({ cwd, envName })).runtimeConfig.seedSamples;

describe("seedSamples", () => {
  it("is on in development", async () => {
    expect(await seedSamplesFor("development")).toBe(true);
  });

  it("is off in production builds", async () => {
    expect(await seedSamplesFor("production")).toBe(false);
  });
});
