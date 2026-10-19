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

To start again from scratch, stop the dev server and run `pnpm dev:reset`, then `pnpm dev`. The reset deletes the `.data/` folder. The next dev server start re-runs the migrations and seeds the admin again with no password. The sample products come back on the next admin login (see [Sample products](#sample-products)). It refuses to run with `NODE_ENV=production`.

## Sample products

In development, the first time an admin logs in (or finishes setup), 24 example products with square placeholder images are added so the store isn't empty. Their edit page notes that they're samples, but they look like any other product everywhere else. Production builds don't add them. This is controlled by the `seedSamples` runtime config, on in development and off in production, and you can override it with the `NUXT_SEED_SAMPLES` environment variable. For example, `NUXT_SEED_SAMPLES=false pnpm dev` runs the site with no samples. They are only ever added once: a `sample_products_seeded` row in the `settings` table records that, so they don't come back once they're gone, for example after you remove them from the database. If the store already has products, no samples are added. To start again with a fresh set, stop the dev server and run `pnpm dev:reset`. The sample data lives in `server/utils/sampleProducts.ts`.

The samples come with 10 tags (Best seller, Under £20, Eco-friendly, Gadgets, Kitchen, Outdoors, For him, For her, For pets and Home office) attached to the products they fit, so each tag is on at least two products and most products have one to three. Best seller, Under £20 and Eco-friendly show on product cards, and every tag except the first two also appears as a filter on collection pages. They are defined in `server/utils/sampleTags.ts` and added in the same transaction as the products. A tag whose slug already exists is left as it is and the samples are linked to it.

Product images uploaded from the create and edit pages are cropped to square in the browser and stored in NuxtHub Blob (`.data/blob` in development). Collection covers are cropped to a 3:1 banner and stored the same way. `POST /api/products/images` takes an optional `prefix` form field, `products` (the default) or `collections`, which decides the folder and the image's URL. Anything else is a 400.

## Brand and theme

The site name is a placeholder, currently **Thingamagift**. It's set once as `SITE_NAME` in `shared/utils/site.ts` and used by the header, admin sidebar and page titles, so change it there to rename the site.

The colour theme is the Signal Blue palette from the design handoff:

- `app/assets/css/main.css` defines the colour scales, the fonts (Figtree for body text, Fredoka for `h1`, `h2` and `font-display`) and the light and dark surface colours. Fonts are downloaded and self-hosted by `@nuxt/fonts`, which picks up any font family named in the CSS; the weights it loads are set under `fonts` in `nuxt.config.ts`.
- `app/app.config.ts` maps Nuxt UI's colours to those scales: `primary` is `signal`, `secondary` is `coral` and `neutral` is `slate`. The status colours use tonal scales too (`success` is `forest`, `info` is `sky`, `warning` is a sunny yellow, `error` is `crimson`). Colours are shaded 600 in light mode and 200 in dark mode so text on them passes contrast; warning and error have their own shading in `app.config.ts`, since yellow is too light for text and a pale red tint looks pink. Commented-out blocks switch to the Ocean Teal or Forest Green palettes; swap the surface colours in `main.css` too if you do.
- `action` is an extra orange colour, registered in `nuxt.config.ts`, for the main call-to-action button on a page (`<UButton color="action">`). Solid action buttons use dark navy text, because white text on orange fails contrast.

## Locale and currency

The site is UK-based. Copy is in British English, prices are in pounds sterling (stored as whole pence in `products.price_pence`), and dates and times use UK formats in the `Europe/London` time zone, e.g. `12 Oct 2026, 14:05`. The formatters in `shared/utils/format.ts` handle this.

## Project structure

| Path                   | What's in it                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `app/`                 | Pages, components, composables and route middleware (Vue)                           |
| `server/api/`          | API routes                                                                          |
| `server/services/`     | Business rules and transactions, one class per area (e.g. `ProductService`)         |
| `server/repositories/` | The only code that queries the database with Drizzle (e.g. `ProductRepository`)     |
| `server/utils/`        | Server helpers, auto-imported: API responses, auth, pure helpers                    |
| `server/db/`           | Drizzle schema, migrations and dev seed SQL                                         |
| `shared/types/`        | Types used by both client and server (`ApiResponse`, `UserState`, `PagedResult`, …) |
| `shared/schemas/`      | Zod validation schemas used by both forms and API routes                            |

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

List endpoints are paginated by offset. They take `?page` (1 or more, default 1) and `?pageSize` (1 to 100, default 20), validated by `pageQuerySchema` in `shared/schemas/pagination.schema.ts`. Their `data` is a `PagedResult<T>` from `shared/types/pagination.ts`. For example, `GET /api/products?page=2&pageSize=20` returns:

```json
{
  "success": true,
  "data": {
    "items": [{ "id": "3f1c9e52-…", "title": "Moon Lamp" }],
    "page": 2,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

On the client, `usePagedFetch` (in `app/composables/pagedFetch.ts`) keeps the current page in the URL, and `<CorePagination>` renders the controls.

## Users

Each user has a `role` (`admin`, `editor`, `user`) and a `state`:

| State      | Meaning                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| `active`   | Can log in. If `password` is `NULL`, they must set one at `/setup` first. |
| `pending`  | Reserved for future approval or confirmation flows; can't log in yet.     |
| `disabled` | Can't log in.                                                             |
| `deleted`  | Treated as if the account doesn't exist.                                  |

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

| Method   | Path            | What it does                                                                                                                     |
| -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/tags`     | Lists tags, each with a `productCount` and the `collections` that use it                                                         |
| `GET`    | `/api/tags/:id` | Returns one tag, or a 404 if it doesn't exist                                                                                    |
| `POST`   | `/api/tags`     | Creates a tag from `{ name }` plus any of the optional details (description, tooltip, icon, priority, showOnCards, showInFilter) |
| `PATCH`  | `/api/tags/:id` | Updates a tag                                                                                                                    |
| `DELETE` | `/api/tags/:id` | Deletes a tag and its product links, unless a collection uses it (a 409 naming the collections)                                  |

Product routes change as follows:

- `GET /api/products?tag=<slug>` filters the list. Repeat it (`?tag=a&tag=b`, up to 20) to filter by several tags: a product matches if it has any of them. Each item now includes `tags`, highest priority first.
- Product create and update accept `tagIds`. If a tag no longer exists, the response is a `VALIDATION_ERROR` on `tagIds`.

## Collections

Collections group products, like Shopify's. Each has a title, a URL handle, a plain text description, an optional image, SEO fields (which fall back to the title and the start of the description), a status and a default sort. The public page is described below, and the admin screens under "Managing collections".

There are two types, fixed when the collection is created:

- **Manual**: you pick the products. They keep the order you added them in.
- **Automated**: the products are chosen by rules. A rule is a tag the product has (or doesn't have) or a retailer it is (or isn't) from, combined with "all" or "any", with one level of subgroups. See `shared/schemas/collectionRules.schema.ts`. `rules` is required for an automated collection.

A collection is a **draft** or **published**. New ones start as drafts. Visitors get a 404 for a draft, and an admin who is logged in can see it, flagged with `isDraft`. The collection page shows that admin a "Preview" ribbon on the hero and tells search engines not to index it.

### The All collection

`/collections/all` is the **All products** collection. A migration inserts it, so it exists on every database. It is locked: it can't be deleted, and its handle, type, rules (it has none, so it matches every product), status and sort can't change. You can edit its title, description, image and SEO fields. Sending a different value for a locked field is a `VALIDATION_ERROR` on that field; sending the value it already has is fine. The handle `all` is reserved, so no other collection can use it.

### Sorting

`GET` product lists take `?sort=`: `newest` (the default), `oldest`, `price-asc`, `price-desc`, `title-asc`, `title-desc` and `manual`. Products with no price come last in both price sorts, and ties fall back to the title, then the id. `manual` (the order products were added) only exists for manual collections. Each collection has a `defaultSort` that applies when the request doesn't name one.

### Tag filter

Turn on **Show in filter** for a tag and it appears as a filter on the collections that have at least one product with it. The first page of `/api/collections/handle/:handle/products` includes `facets.tags`: those tags, highest priority first, each with its product count. The counts cover the whole collection, so choosing a tag (`?tag=<slug>`) narrows the products but doesn't hide the other filters.

### Stored values

What the database stores is defined in `server/` only (`server/utils/storedCollection.ts` and `storedCollectionRules.ts`), separately from the values the API and the app use (`shared/types/collection.ts`, `collectionRules.ts`). `server/utils/collectionMapper.ts` converts between them, and a contract test pins the stored values, so renaming one in the API doesn't touch the data.

### The collection page

`/collections/<handle>` is the public page for a collection, and `/collections/all` is the All products collection. It reads the two public routes below. An unknown handle, or a draft for a visitor, gives a 404 page.

- **Hero**: a full-width band with the title and plain text description at the bottom left, about 280px tall on phones and 380px on larger screens. A cover image fills the band (using its alt text) under a navy gradient that keeps the text legible; without one the band is plain navy.
- **Toolbar**: the product count, a **Sort by** select and, when any tag has Show in filter on a product in the collection, a **Filter by tag** select (one tag at a time, plus "All"). The sorts are Newest, Oldest, Price: low to high, Price: high to low, A–Z and Z–A, plus Featured (the manual order) for collections where you pick the products. The default is the collection's own default sort.
- **URL**: the sort and tag live in the query string (`?sort=price-asc&tag=gifts`), so links can be shared and back and forward work. The collection's default sort isn't written to the URL. Changing either one restarts the list from page 1.
- **Products**: a grid of 2 columns on phones, 3 on medium and 4 on large screens, with a **Load more** button (not infinite scroll). The server renders the first page without knowing the screen width, so the page size is `rowAlignedPageSize(20, PRODUCT_GRID_COLUMNS)` (`shared/utils/pageSize.ts`), the smallest size of at least 20 that fills whole rows at 2, 3 and 4 columns: 24.
- **SEO**: the resolved SEO title and description, the cover image as the social image, and `CollectionPage` structured data with an `ItemList` of the loaded products (`app/utils/collectionJsonLd.ts`).

`/products` redirects permanently (301) to `/collections/all`, set in `routeRules` in `nuxt.config.ts`.

### Collection routes

| Method   | Path                                       | Who    | What it does                                                                                                             |
| -------- | ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `GET`    | `/api/collections`                         | Admin  | Lists collections with their product count and a sentence describing the rules                                           |
| `POST`   | `/api/collections`                         | Admin  | Creates a collection                                                                                                     |
| `GET`    | `/api/collections/:id`                     | Admin  | Returns one collection for editing, with its rules and `productIds`                                                      |
| `GET`    | `/api/collections/by-handle/:handle`       | Admin  | The same as `GET /api/collections/:id`, found by handle (drafts included). Used by the admin edit page                   |
| `PATCH`  | `/api/collections/:id`                     | Admin  | Changes the fields sent. The type can't change                                                                           |
| `DELETE` | `/api/collections/:id`                     | Admin  | Deletes a collection (not the All collection)                                                                            |
| `POST`   | `/api/collections/preview`                 | Admin  | Takes `{ rules, sort }` and returns `{ total, items }` with the first 12 matches                                         |
| `GET`    | `/api/collections/handle/:handle`          | Public | The collection's details (including its `type`), with SEO resolved and no rules. Drafts 404 unless an admin is logged in |
| `GET`    | `/api/collections/handle/:handle/products` | Public | A page of products (`?page`, `?pageSize`, `?sort`, `?tag`) plus `facets` on page 1. Same draft rule                      |
| `GET`    | `/api/products/retailers`                  | Admin  | The distinct retailers, for the retailer rule's dropdown                                                                 |

A tag that a collection's rules use can't be deleted. The request fails with a 409 that names the collections, and the admin tags page explains the same.

### Managing collections

**Admin → Collections** (`/admin/collections`) lists every collection with its type (Hand-picked or Automatic), status (Draft or Live), product count and a sentence describing its rules. The locked All products collection has a **Locked** badge, and each row links to its page on the site (`/collections/<handle>`).

**Add collection** (`/admin/collections/new`) and each collection's page (`/admin/collections/<handle>`, such as `/admin/collections/wedding-gifts`) share one form, laid out like the product form. The type is chosen when you create a collection and is read-only afterwards. If you change the handle and save, the page moves to the new URL. An unknown handle shows a "couldn't load this collection" message. The handles `all` and `new` are reserved, since `/admin/collections/new` is the create page.

- **Details:** the title and a plain text description of up to 500 characters, with a character count.
- **Hand-picked collections** have a **Products** card. **Add products** opens a dialog that searches the product list by title (`GET /api/products?q=`, a case-insensitive "contains") and lets you tick products to add; further results load automatically as you scroll to the end of the list. Products show in the order they were added, and each has a remove button.
- **Automatic collections** have a **Conditions** card and a **Preview** card. Choose whether products must match **all** or **any** of the conditions, then add conditions and groups. A group has its own all/any switch and conditions, and groups can't be nested. A condition is a tag the product has or doesn't have, or a retailer it is or isn't from. The retailer list comes from the retailers on existing products, and you can type one that isn't there yet. Retailers are matched exactly. The preview shows how many products match, a sentence describing the rules and the first 12 products. It updates a moment after you stop editing, once the conditions are complete.
- **Cover image:** uploaded and cropped to 3:1 in the browser, with alt text and a small preview of the banner.
- **Search listing:** the URL handle fills in from the title until you edit it, then the page title and meta description, which show the title and the start of the description as placeholders, with a Google-style preview.
- **Default sort:** "Featured (manual order)" is only offered for hand-picked collections, and is their starting choice.
- **Live switch:** in the Details card, under the description. Off (the default) is a draft that only admins can see; on (green) publishes the collection. The All products collection has no switch, since it is always live.
- **The All products collection** shows a note and keeps its handle, type, status, sort and conditions read-only. You can edit its title, description, image and search listing. It has no delete button.
- **Saving** shows server problems, such as the reserved `all` handle or a handle already in use, on the field they belong to. Unsaved changes show the usual bar and prompt before you leave.
- **Delete collection** at the bottom of the page asks for confirmation. It deletes the collection but not its products.

## Product pages

Each product has a public page at `/product/<handle>`. The handle is built from the title when the product is created (lowercase, with hyphens), stays fixed after that, and can be changed in the admin form. Product cards link to this page rather than straight to the retailer.

The page shows an image gallery, every tag on the product (not just the on-card ones), the brand, the price, a **Buy at {retailer}** button that opens the affiliate link in a new tab, and the description. It also sets the SEO title and description (falling back to the title and description) and adds schema.org `Product` structured data.

Products have an optional **brand** (who makes it) alongside the **retailer** (the shop the affiliate link goes to).

The page reads from a public route:

| Method | Path                           | What it does                                                           |
| ------ | ------------------------------ | ---------------------------------------------------------------------- |
| `GET`  | `/api/products/handle/:handle` | Returns the product with its images and every tag as a badge, or a 404 |

The description comes from the rich text editor as HTML. This route sanitises it with `sanitiseRichText` (`server/utils/richText.ts`), keeping only the formatting the editor supports, so the page can render it.

The homepage shows products in a horizontal row that scrolls at every width, with arrow buttons on large screens. It reads the All products collection (`/api/collections/handle/all/products`), loading 10 products, then 10 more each time the row nears its end until every product is in, and finishes with a **View all** card, which links to `/collections/all`. Arrows that have nothing to scroll to are hidden.

## Testing

| Command           | What it runs                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`       | Unit tests (Node) and component tests (headless Chromium, with accessibility checks)                                        |
| `pnpm test:types` | Type check of the app, server and tests                                                                                     |
| `pnpm test:e2e`   | Playwright end-to-end tests against a dev server with its own database (`.data-e2e/`), so your `.data/` is untouched        |
| `pnpm lint:check` | Oxlint and an Oxfmt format check through Vite+ (`vp lint && vp fmt --check`), without fixing. `pnpm lint` fixes and formats |
| `pnpm storybook`  | Storybook for the core components on `http://localhost:6006`                                                                |

Repository and service tests run against an in-memory PGlite database with the real migrations applied (`createTestDb()` in `test/setup/db.ts`), so they don't mock the database. `resetDb()` empties the tables and then puts back the locked All collection, so a test starts with the same row a real database has.

The first time, install the test browser with `pnpm exec playwright install chromium`. CI runs all of these on every pull request.

Linting, formatting and the Vitest config all live in `vite.config.ts`. `pnpm install` sets up a pre-commit hook (`.vite-hooks/pre-commit`) that lints and formats staged files with `vp staged`. In VS Code, install the recommended Oxc extension to format on save.

## Production

```bash
pnpm build
pnpm preview
```

The admin seed doesn't run in production. You'll need to create the first admin user yourself for now.

## Contributing

1. Pull the latest `main` and create a branch from it: `bug/<short-description>` for bug fixes, `feature/<short-description>` for everything else. Keep the description short and concise, 20 characters at most (e.g. `feature/sample-products`).
2. Open a pull request when you're ready. Nothing is merged into `main` without a review and approval from another person.
