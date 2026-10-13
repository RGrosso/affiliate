import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "hub:db:schema";

/**
 * What repositories and services query through: NuxtHub's `db`, a transaction `tx` inside it,
 * or a PGlite database in tests. Pass `tx` to share one transaction across several repositories.
 */
export type DbExecutor = PgDatabase<PgQueryResultHKT, typeof schema>;

/** True when a Postgres unique constraint was violated (SQLSTATE 23505), even if wrapped by Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
