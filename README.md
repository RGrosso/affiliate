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

To start again from scratch, stop the dev server and run `pnpm dev:reset`, then `pnpm dev`. The reset deletes the `.data/` folder. The next dev server start re-runs the migrations and seeds the admin again with no password. The sample products come back on the next admin login. It refuses to run with `NODE_ENV=production`.

## Sample products

The first time an admin logs in (or finishes setup), 24 example products with square placeholder images are added so the store isn't empty. A warning on **Admin → Products** lets you delete all of them in one go. They're only ever added once: a `sample_products_seeded` row in the `settings` table records that, so deleting them won't bring them back. If the store already has products, no samples are added. The sample data lives in `server/utils/sampleProducts.ts`.

Product images uploaded from the create and edit pages are cropped to square in the browser and stored in NuxtHub Blob (`.data/blob` in development).

## Brand and theme

The site name is a placeholder, currently **Thingamagift**. It's set once as `SITE_NAME` in `shared/utils/site.ts` and used by the header, admin sidebar and page titles, so change it there to rename the site.

The colour theme is the Signal Blue palette from the design handoff:

- `app/assets/css/main.css` defines the colour scales, the fonts (Figtree for body text, Fredoka for `h1`, `h2` and `font-display`) and the light and dark surface colours. Fonts are downloaded and self-hosted by `@nuxt/fonts`, which picks up any font family named in the CSS; the weights it loads are set under `fonts` in `nuxt.config.ts`.
- `app/app.config.ts` maps Nuxt UI's colours to those scales: `primary` is `signal`, `secondary` is `coral` and `neutral` is `slate`. The status colours use tonal scales too (`success` is `forest`, `info` is `sky`, `warning` is a sunny yellow, `error` is `crimson`). Colours are shaded 600 in light mode and 200 in dark mode so text on them passes contrast; warning and error have their own shading in `app.config.ts`, since yellow is too light for text and a pale red tint looks pink. Commented-out blocks switch to the Ocean Teal or Forest Green palettes; swap the surface colours in `main.css` too if you do.
- `action` is an extra orange colour, registered in `nuxt.config.ts`, for the main call-to-action button on a page (`<UButton color="action">`). Solid action buttons use dark navy text, because white text on orange fails contrast.

## Locale and currency

The site is UK-based. Copy is in British English, prices are in pounds sterling (stored as whole pence in `products.price_pence`), and dates and times use UK formats in the `Europe/London` time zone, e.g. `12 Oct 2026, 14:05`. The formatters in `shared/utils/format.ts` handle this.

## Project structure

| Path | What's in it |
| --- | --- |
| `app/` | Pages, components, composables and route middleware (Vue) |
| `server/api/` | API routes |
| `server/services/` | Business rules and transactions, one class per area (e.g. `ProductService`) |
| `server/repositories/` | The only code that queries the database with Drizzle (e.g. `ProductRepository`) |
| `server/utils/` | Server helpers, auto-imported: API responses, auth, pure helpers |
| `server/db/` | Drizzle schema, migrations and dev seed SQL |
| `shared/types/` | Types used by both client and server (`ApiResponse`, `UserState`, `PagedResult`, …) |
| `shared/schemas/` | Zod validation schemas used by both forms and API routes |

## Server structure

API routes in `server/api/` are thin. A route checks the caller where needed (`requireAdmin`), validates the input, calls one service method and returns `ok(...)`. It never queries the database itself.

- **Services** (`server/services/`) hold the business rules: converting pounds to pence, building a handle from the title when none is given, turning a duplicate handle into a field error, and throwing 404s. They own transactions.
- **Repositories** (`server/repositories/`) are the only code that queries the database. They return rows or `undefined` and never throw HTTP errors.

Both are classes that take a `DbExecutor` (defined in `server/utils/db.ts`) in the constructor. That can be NuxtHub's `db`, a transaction or a test database. A route creates one with e.g. `new ProductService(db).list(query)`. Inside a transaction, a service builds its repositories on `tx` so they share it. Services and repositories are auto-imported, like `server/utils/`. Pure helpers, such as `toProductValues` in `server/utils/products.ts`, stay in `server/utils/`.

## API responses

Every `/api` route is wrapped in `defineApiHandler` and returns one of two shapes (see `shared/types/api.ts`):

```ts
// success
{ success: true, data: T, message?: string }

// failure (with the matching HTTP status)
{ success: false, code: "VALIDATION_ERROR" | "UNAUTHORIZED" | ..., message: string, fieldErrors?: Record<string, string[]> }
```

On the server, return `ok(data, message?)` and throw `apiError(code, message)` or one of the shortcuts: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`. Use `readValidated(event, schema)` to parse and validate a request body, `readValidatedQuery(event, schema)` for query parameters, and `requireUser` / `requireAdmin` to guard a route.

On the client, `getApiError(err)` turns a failed `$fetch` into an `ApiError`, and `toFormErrors(error.fieldErrors)` maps it onto a `UForm`.

List endpoints are paginated by offset. They take `?page` (1 or more, default 1) and `?pageSize` (1 to 100, default 20), validated by `pageQuerySchema` in `shared/schemas/pagination.schema.ts`. Their `data` is a `PagedResult<T>` from `shared/types/pagination.ts`. `GET /api/products` also returns `sampleCount`. For example, `GET /api/products?page=2&pageSize=20` returns:

```json
{
  "success": true,
  "data": {
    "items": [{ "id": "3f1c9e52-…", "title": "Moon Lamp" }],
    "page": 2,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3,
    "sampleCount": 20
  }
}
```

On the client, `usePagedFetch` (in `app/composables/pagedFetch.ts`) keeps the current page in the URL, and `<CorePagination>` renders the controls.

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

## Tags

Tags label products. They'll later drive filtering and collections. They're stored in `tags` and linked to products through `product_tags`. Deleting a tag or a product removes its links.

A tag is unique by its slug, which is built from the name. "Air Fryers" and "air fryers" are the same tag, so adding a duplicate is rejected with "A tag with this name already exists".

Each tag has:

- **Name and slug**: the slug is generated from the name.
- **Description** and **tooltip**: the tooltip is shown when you hover over the tag.
- **Icon**: a key from a fixed list in `shared/types/tag.ts`: `star`, `sparkle`, `flame`, `percent`, `tag`, `gift`, `heart`, `trophy`, `zap`, `smile` and `leaf`. The app maps each key to a Lucide icon in `app/utils/tagIcons.ts`, so you can change how icons look without touching the data.
- **Priority**: higher shows first. An empty priority counts as 0 (`sortTagsByPriority`).
- **Show on cards**: product cards show at most 3 of the tags with this turned on, highest priority first.

In the admin:

- The Tags card on the product form lets you pick existing tags or add new ones. Type a new name and choose **Add** to create the tag straight away.
- **Admin → Tags** (`/admin/tags`) lets you edit descriptions, tooltips, icons, priority and card visibility, or delete tags. It also shows how many products use each tag.
- **Admin → Products** has a tags column and a tag filter.

Tag routes are admin only:

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/api/tags` | Lists tags, each with a `productCount` and the `collections` that use it |
| `GET` | `/api/tags/:id` | Returns one tag, or a 404 if it doesn't exist |
| `POST` | `/api/tags` | Creates a tag from `{ name }` plus any of the optional details (description, tooltip, icon, priority, showOnCards, showInFilter) |
| `PATCH` | `/api/tags/:id` | Updates a tag |
| `DELETE` | `/api/tags/:id` | Deletes a tag and its product links, unless a collection uses it (a 409 naming the collections) |

Product routes change as follows:

- `GET /api/products?tag=<slug>` filters the list. Repeat it (`?tag=a&tag=b`, up to 20) to filter by several tags: a product matches if it has any of them. Each item now includes `tags`, highest priority first.
- Product create and update accept `tagIds`. If a tag no longer exists, the response is a `VALIDATION_ERROR` on `tagIds`.

## Collections

Collections group products, like Shopify's. Each has a title, a URL handle, a plain text description, an optional image, SEO fields (which fall back to the title and the start of the description), a status and a default sort. This release is the backend only: the admin pages, the public page and the homepage changes come later.

There are two types, fixed when the collection is created:

- **Manual**: you pick the products. They keep the order you added them in.
- **Automated**: the products are chosen by rules. A rule is a tag the product has (or doesn't have) or a retailer it is (or isn't) from, combined with "all" or "any", with one level of subgroups. See `shared/schemas/collectionRules.schema.ts`. `rules` is required for an automated collection.

A collection is a **draft** or **published**. New ones start as drafts. Visitors get a 404 for a draft, and an admin who is logged in can see it, flagged with `isDraft`.

### The All collection

`/collections/all` is the **All products** collection. A migration inserts it, so it exists on every database. It is locked: it can't be deleted, and its handle, type, rules (it has none, so it matches every product), status and sort can't change. You can edit its title, description, image and SEO fields. Sending a different value for a locked field is a `VALIDATION_ERROR` on that field; sending the value it already has is fine. The handle `all` is reserved, so no other collection can use it.

### Sorting

`GET` product lists take `?sort=`: `newest` (the default), `oldest`, `price-asc`, `price-desc`, `title-asc`, `title-desc` and `manual`. Products with no price come last in both price sorts, and ties fall back to the title, then the id. `manual` (the order products were added) only exists for manual collections. Each collection has a `defaultSort` that applies when the request doesn't name one.

### Tag filter

Turn on **Show in filter** for a tag and it appears as a filter on the collections that have at least one product with it. The first page of `/api/collections/handle/:handle/products` includes `facets.tags`: those tags, highest priority first, each with its product count. The counts cover the whole collection, so choosing a tag (`?tag=<slug>`) narrows the products but doesn't hide the other filters.

### Stored values

What the database stores is defined in `server/` only (`server/utils/storedCollection.ts` and `storedCollectionRules.ts`), separately from the values the API and the app use (`shared/types/collection.ts`, `collectionRules.ts`). `server/utils/collectionMapper.ts` converts between them, and a contract test pins the stored values, so renaming one in the API doesn't touch the data.

### Collection routes

| Method | Path | Who | What it does |
| --- | --- | --- | --- |
| `GET` | `/api/collections` | Admin | Lists collections with their product count and a sentence describing the rules |
| `POST` | `/api/collections` | Admin | Creates a collection |
| `GET` | `/api/collections/:id` | Admin | Returns one collection for editing, with its rules and `productIds` |
| `PATCH` | `/api/collections/:id` | Admin | Changes the fields sent. The type can't change |
| `DELETE` | `/api/collections/:id` | Admin | Deletes a collection (not the All collection) |
| `POST` | `/api/collections/preview` | Admin | Takes `{ rules, sort }` and returns `{ total, items }` with the first 12 matches |
| `GET` | `/api/collections/handle/:handle` | Public | The collection's details, with SEO resolved and no rules. Drafts 404 unless an admin is logged in |
| `GET` | `/api/collections/handle/:handle/products` | Public | A page of products (`?page`, `?pageSize`, `?sort`, `?tag`) plus `facets` on page 1. Same draft rule |
| `GET` | `/api/products/retailers` | Admin | The distinct retailers, for the retailer rule's dropdown |

A tag that a collection's rules use can't be deleted. The request fails with a 409 that names the collections, and the admin tags page explains the same.

## Product pages

Each product has a public page at `/product/<handle>`. The handle is built from the title when the product is created (lowercase, with hyphens), stays fixed after that, and can be changed in the admin form. Product cards link to this page rather than straight to the retailer.

The page shows an image gallery, every tag on the product (not just the on-card ones), the brand, the price, a **Buy at {retailer}** button that opens the affiliate link in a new tab, and the description. It also sets the SEO title and description (falling back to the title and description) and adds schema.org `Product` structured data.

Products have an optional **brand** (who makes it) alongside the **retailer** (the shop the affiliate link goes to).

The page reads from a public route:

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/api/products/handle/:handle` | Returns the product with its images and every tag as a badge, or a 404 |

The description comes from the rich text editor as HTML. This route sanitises it with `sanitiseRichText` (`server/utils/richText.ts`), keeping only the formatting the editor supports, so the page can render it.

The homepage shows products in a horizontal row that scrolls at every width, with arrow buttons on large screens. It loads 10 products, then 10 more each time the row nears its end until every product is in, and finishes with a **View all** card, which links to `/collections/all`, a placeholder until collections exist. Arrows that have nothing to scroll to are hidden.

## Testing

| Command | What it runs |
| --- | --- |
| `pnpm test` | Unit tests (Node) and component tests (headless Chromium, with accessibility checks) |
| `pnpm test:types` | Type check of the app, server and tests |
| `pnpm test:e2e` | Playwright end-to-end tests against a dev server with its own database (`.data-e2e/`), so your `.data/` is untouched |
| `pnpm lint:check` | ESLint without fixing (`pnpm lint` fixes) |
| `pnpm storybook` | Storybook for the core components on `http://localhost:6006` |

Repository and service tests run against an in-memory PGlite database with the real migrations applied (`createTestDb()` in `test/setup/db.ts`), so they don't mock the database. `resetDb()` empties the tables and then puts back the locked All collection, so a test starts with the same row a real database has.

The first time, install the test browser with `pnpm exec playwright install chromium`. CI runs all of these on every pull request.

## Production

```bash
pnpm build
pnpm preview
```

The admin seed doesn't run in production. You'll need to create the first admin user yourself for now.

## Contributing

1. Pull the latest `main` and create a branch from it: `bug/<short-description>` for bug fixes, `feature/<short-description>` for everything else. Keep the description short and concise, 20 characters at most (e.g. `feature/sample-products`).
2. Open a pull request when you're ready. Nothing is merged into `main` without a review and approval from another person.
