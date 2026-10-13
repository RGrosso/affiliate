# Agent guide

Nuxt 4 affiliate product site: Nuxt UI v4, NuxtHub (Postgres via Drizzle, Blob storage), `nuxt-auth-utils`. `README.md` is the human guide to setup, the API response shape and user states; read it before your first change.

Read `app/VUE.md` before writing or editing any `.vue` file or composable: it covers props, emits, slots and VueUse.

Read `app/APP.md` before building or styling UI: it covers the site name, theme colours and the core components that wrap Nuxt UI.

## Workflow

- Package manager is `pnpm`.
- `pnpm lint` runs ESLint with `--fix`, so it rewrites files. Run it after every change and review what it changed. CI runs `pnpm lint:check`, which only reports.
- Run `pnpm test` (unit and component tests) and `pnpm test:types` after every change, and `pnpm test:e2e` when you change a page, API route or user journey. CI runs all three plus a Storybook build.
- Unit tests sit beside the file they test as `*.test.ts`; end-to-end tests live in `test/e2e/`. Component rules (own folder, test, story) are in `app/APP.md`.
- Dev data lives in `.data/` (embedded PGlite and blob files). Deleting it resets the app to first run: the dev admin is re-seeded with no password and sample products come back on next admin login.
- When behaviour described in `README.md` changes, update the README in the same change.
- Keep comments for the non-obvious, like why something is done or a gotcha. Don't add docblocks that restate a name or type.
- Avoid `any` in TypeScript. Use a precise type, `unknown` with narrowing, or a generic.
- When you finish a task, end with a short, concise summary of the changes: what changed and why, in a few bullets.

## Git workflow

- Before starting a task, pull the latest `main` and create a new branch from it, unless you're told to use a different branch.
- Name the branch by the type of work:
  - `bug/<short-description>` for fixing something that's broken.
  - `feature/<short-description>` for everything else.
- Keep `<short-description>` short and concise: lowercase words separated by hyphens, 20 characters at most (e.g. `feature/sample-products`, `bug/login-redirect`).
- Never merge into `main` yourself. Every change goes through a pull request, and another person must approve it before it's merged.

## Locale: English (GB)

The site is UK-based. Always prefer British English and UK formats over US ones.

- Write all copy, validation messages, comments and docs in British English: "colour", "favourite", "organise", "cancelled", "licence" (noun).
- Use the shared formatters in `shared/utils/format.ts` instead of building your own `Intl` formatter. They use `LOCALE` (`en-GB`), `CURRENCY` (`GBP`) and the `Europe/London` time zone.
  - Prices: `formatCurrency(pence)` → `£34.99`. Options: `minDecimals` and `maxDecimals`, each `0` or `2` (default `2`). `{ minDecimals: 0 }` drops `.00` from whole amounts (`£429`); `{ maxDecimals: 0 }` rounds to whole pounds (`£35`).
  - Dates: `formatDate(value)` → `12 Oct 2026`, so day before month. Never `10/12/2026` or `Oct 12`.
  - Date and time: `formatDateTime(value)` → `12 Oct 2026, 14:05`. Use the 24-hour clock.
- Never call `toLocaleString()`, `toLocaleDateString()` or `Intl.*` without a locale. They fall back to the browser or server default, which may be US.
- Nuxt UI is set to `en_gb` on `UApp` in `app/app.vue`, and `<html lang="en-GB">` is set in `nuxt.config.ts`. Pass `:locale="LOCALE"` and `currency: CURRENCY` to currency inputs such as `UInputNumber`.
- Prefer metric units in copy (cm, kg, litres, °C), except where inches are the usual UK term, such as screen sizes and pan diameters.

## Server code

- New data access goes in a repository in `server/repositories/`. Repositories are the only code that queries `db` with Drizzle.
- Business rules go in a service in `server/services/`. Services own transactions and build repositories on `tx` inside them.
- Routes in `server/api/` stay thin: check auth, validate input with `readValidated` or `readValidatedQuery`, call one service method and return `ok(...)`. Never query `db` from a route.
- New list endpoints validate `?page` and `?pageSize` with `pageQuerySchema` and return `PagedResult<T>`, both from `shared/`.
- Test repositories and services against `createTestDb()` in `test/setup/db.ts`, not by mocking `db`.

## Shared code (`shared/`)

`shared/` is imported by both client and server through `#shared/...`.

- Import `z` from `#shared/schemas/zod`, never from `"zod"`. That module installs the friendly fallback error messages; importing `"zod"` directly skips them.
- One Zod schema validates both the `UForm` and the API route. Add or change validation in `shared/schemas/`, and the form and route pick it up together.
- Validation messages are shown to end users as-is: write them as plain, friendly sentences ("The title can be at most 255 characters").
- Money is in pounds sterling (GBP). It's stored as whole pence (`pricePence`) and entered as pounds (`price: 19.99`). Convert at the boundary in `server/utils/products.ts` and display with `formatCurrency`. Never use cents, dollars or `USD`.
