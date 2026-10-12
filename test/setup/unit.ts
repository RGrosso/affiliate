// Server code relies on Nitro's auto-imports (h3, shared/utils, server/utils). Plain Node unit tests
// don't have them, so expose the same names on globalThis. `db` is NuxtHub's and isn't provided: mock it.
import * as h3 from "h3";

const utils = import.meta.glob<Record<string, unknown>>(
  ["../../shared/utils/*.ts", "../../server/utils/*.ts", "!**/*.test.ts"],
  { eager: true }
);

Object.assign(globalThis, h3, ...Object.values(utils));
