// Server utils rely on Nitro's auto-imports. Plain Node unit tests don't have them, so expose the h3 ones they use.
import { createError, getRouterParams, readBody } from "h3";

Object.assign(globalThis, { createError, getRouterParams, readBody });
