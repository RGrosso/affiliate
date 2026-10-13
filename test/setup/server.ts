// Server code relies on Nitro's auto-imports (h3, shared/utils, server/utils, repositories, services). Plain Node tests
// don't have them, so expose the same names on globalThis. NuxtHub's `db` isn't provided: repository and
// service tests pass a `createTestDb()` database instead.
import * as h3 from "h3";

const utils = import.meta.glob<Record<string, unknown>>(
  [
    "../../shared/utils/*.ts",
    "../../server/utils/*.ts",
    "../../server/repositories/*.ts",
    "../../server/services/*.ts",
    "!**/*.test.ts",
  ],
  { eager: true }
);

Object.assign(globalThis, h3, ...Object.values(utils));
