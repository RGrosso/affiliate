// Deletes the local dev data (.data/: the PGlite database and blob files), so the next `nuxt dev`
// starts from first run: migrations re-run, the dev admin is re-seeded with no password, and the
// sample products come back on the next admin login. Development only: it never touches a real database.
import process from "node:process";
import { rmSync } from "node:fs";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset data with NODE_ENV=production. This script is for local development only.");
  process.exit(1);
}

try {
  rmSync(".data", { recursive: true, force: true });
} catch (error) {
  // Windows locks the database files while the dev server has them open
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EBUSY" || code === "EPERM") {
    console.error("Couldn't delete .data/ because it's in use. Stop the dev server and try again.");
    process.exit(1);
  }
  throw error;
}

console.log("Deleted .data/. The next dev server start sets everything up again.");
