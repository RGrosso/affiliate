# Server guide

How server code is layered and tested. A server change is done when it sits in the right layer and every behaviour it adds or changes has a test that goes red without it.

## Layers: repository pattern

Each request flows route → service → repository. Keep each piece in its own layer:

- **Repositories** (`server/repositories/`) hold all data access: one class per aggregate (`ProductRepository`, `TagRepository`, `SettingsRepository`), and the only code that queries `db` with Drizzle. They take a `DbExecutor` in the constructor, return rows or `undefined`, and leave HTTP errors and business rules to the service.
- **Services** (`server/services/`) hold the business rules: converting input to row values, turning unique violations into field errors, throwing 404s, and deciding what a caller may see. They own transactions and build repositories on `tx` inside them, so every write in one operation shares it.
- **Routes** (`server/api/`) stay thin: check auth (`requireAdmin`), validate input with `readValidated` or `readValidatedQuery` against a schema from `shared/schemas/`, call one service method, and return `ok(...)`.
- **Utils** (`server/utils/`) hold pure helpers that take values and return values, such as `toProductValues`. A helper that needs a repository belongs on a service.

New data access starts as a repository method, even a one-line query. New list endpoints validate `?page` and `?pageSize` with `pageQuerySchema` and return `PagedResult<T>`, both from `shared/`.

## Tests for everything

Every repository method, service method, util and route ships with tests in the same change:

- **Repositories and services**: test against a real database with `createTestDb()`, `resetDb()` and `insertTestUser()` from `test/setup/db.ts`, one database per file. Cover the happy path, each error the code throws, and the edge cases its queries handle (empty input, filters, ordering, totals, cascades, a transaction rolling back).
- **Utils**: unit tests beside the file as `*.test.ts`.
- **Routes**: the behaviour lives in the service tests; add a case to `test/e2e/api.spec.ts` for what only the route decides, such as auth (401 or 403 when logged out) and query or body validation.
- **Bugs**: write the test that goes red on the bug first, then fix it.

Before calling server work finished, run `pnpm test`, `pnpm test:types` and `pnpm lint`, and `pnpm test:e2e` when a route changed.
