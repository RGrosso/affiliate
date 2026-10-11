import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  // NuxtHub reads migrations per dialect from this folder
  out: "./server/db/migrations/postgresql",
});
