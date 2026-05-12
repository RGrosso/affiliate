import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts", // Make sure this matches your path
  out: "./server/db/migrations",
});
