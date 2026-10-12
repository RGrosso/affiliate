# Affiliate

An ecommerce-style product site built with Nuxt 4, Nuxt UI, NuxtHub (Postgres via Drizzle) and `nuxt-auth-utils`. Products will link out to affiliate stores.

## Getting started

Install dependencies:

```bash
pnpm install
```

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

Locally, NuxtHub uses an embedded Postgres database (PGlite) stored in `.data/`. You don't need to install or run Postgres yourself. Migrations run automatically when the dev server starts.

## First run: set up your admin account

The first time you run `pnpm dev`, the app creates an **`admin`** user **with no password**. This happens in development only. It's done by `server/db/seed/admin.sql`, which `modules/dev-seed.ts` registers, and it's never included in a production build.

To finish setting it up:

1. Open `http://localhost:3000/login`. While no account has a password yet, you'll be sent straight to `/setup`.
2. Enter the username **`admin`** and press **Next**.
3. Choose a password and type it again to confirm. It needs at least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.
4. You'll be logged in and taken to the admin dashboard at `/admin`.

The same flow applies to any user whose password is empty (`NULL`). Logging in as that user sends them to `/setup` to choose a password first.

To start again from scratch, stop the dev server and delete the `.data/` folder. The admin will be seeded again on the next `pnpm dev`.

## Sample products

The first time an admin logs in (or finishes setup), 20 example products with square placeholder images are added so the store isn't empty. A warning on **Admin → Products** lets you delete all of them in one go. They're only ever added once: a `sample_products_seeded` row in the `settings` table records that, so deleting them won't bring them back. The sample data lives in `server/utils/sampleProducts.ts`.

Product images uploaded from the create page are cropped to square in the browser and stored in NuxtHub Blob (`.data/blob` in development).

## Locale and currency

The site is UK-based. Copy is in British English, prices are in pounds sterling (stored as whole pence in `products.price_pence`), and dates and times use UK formats in the `Europe/London` time zone, e.g. `12 Oct 2026, 14:05`. The formatters in `shared/utils/format.ts` handle this.

## Project structure

| Path | What's in it |
| --- | --- |
| `app/` | Pages, components, composables and route middleware (Vue) |
| `server/api/` | API routes |
| `server/utils/` | Server helpers, auto-imported: API responses, auth |
| `server/db/` | Drizzle schema, migrations and dev seed SQL |
| `shared/types/` | Types used by both client and server (`ApiResponse`, `UserState`, …) |
| `shared/schemas/` | Zod validation schemas used by both forms and API routes |

## API responses

Every `/api` route is wrapped in `defineApiHandler` and returns one of two shapes (see `shared/types/api.ts`):

```ts
// success
{ success: true, data: T, message?: string }

// failure (with the matching HTTP status)
{ success: false, code: "VALIDATION_ERROR" | "UNAUTHORIZED" | ..., message: string, fieldErrors?: Record<string, string[]> }
```

On the server, return `ok(data, message?)` and throw `apiError(code, message)` or one of the shortcuts: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`. Use `readValidated(event, schema)` to parse and validate a request body, and `requireUser` / `requireAdmin` to guard a route.

On the client, `getApiError(err)` turns a failed `$fetch` into an `ApiError`, and `toFormErrors(error.fieldErrors)` maps it onto a `UForm`.

## Users

Each user has a `role` (`admin`, `editor`, `user`) and a `state`:

| State | Meaning |
| --- | --- |
| `active` | Can log in. If `password` is `NULL`, they must set one at `/setup` first. |
| `pending` | Reserved for future approval or confirmation flows; can't log in yet. |
| `disabled` | Can't log in. |
| `deleted` | Treated as if the account doesn't exist. |

## Database

After changing `server/db/schema.ts`, generate a migration:

```bash
npx nuxt hub db generate
```

It's applied automatically the next time you run `pnpm dev`.

## Production

```bash
pnpm build
pnpm preview
```

The admin seed doesn't run in production. You'll need to create the first admin user yourself for now.
