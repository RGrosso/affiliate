/** True when a Postgres unique constraint was violated (SQLSTATE 23505), even if wrapped by Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current && typeof current === "object") {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
