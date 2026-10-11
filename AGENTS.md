# Agent guide

Nuxt 4 affiliate product site: Nuxt UI v4, NuxtHub (Postgres via Drizzle, Blob storage), `nuxt-auth-utils`. `README.md` is the human guide to setup, the API response shape and user states; read it before your first change.

Read `app/VUE.md` before writing or editing any `.vue` file or composable: it covers props, emits, slots and VueUse.

## Workflow

- Package manager is `pnpm`.
- `pnpm lint` is the check: it runs ESLint with `--fix`, so it rewrites files. Run it after every change and review what it changed. There is no test suite yet.
- Dev data lives in `.data/` (embedded PGlite and blob files). Deleting it resets the app to first run: the dev admin is re-seeded with no password and sample products come back on next admin login.
- When behaviour described in `README.md` changes, update the README in the same change.

## Shared code (`shared/`)

`shared/` is imported by both client and server through `#shared/...`.

- Import `z` from `#shared/schemas/zod`, never from `"zod"`. That module installs the friendly fallback error messages; importing `"zod"` directly skips them.
- One Zod schema validates both the `UForm` and the API route. Add or change validation in `shared/schemas/`, and the form and route pick it up together.
- Validation messages are shown to end users as-is: write them as plain, friendly sentences ("The title can be at most 255 characters").
- Money is stored as whole cents (`priceCents`) and entered as major units (`price: 19.99`). Convert at the boundary in `server/utils/products.ts` and display with `formatPrice`.
