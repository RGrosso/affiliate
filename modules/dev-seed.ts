import { defineNuxtModule, createResolver } from "nuxt/kit";

/**
 * Registers the SQL seed files with NuxtHub so they run after migrations.
 * Only in dev, so a password-less admin never reaches production.
 */
export default defineNuxtModule({
  meta: { name: "dev-seed" },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return;

    const { resolve } = createResolver(import.meta.url);

    nuxt.hook("hub:db:queries:paths", (paths, dialect) => {
      if (dialect !== "postgresql") return;
      paths.push(resolve("../server/db/seed/admin.sql"));
    });
  },
});
