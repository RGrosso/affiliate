import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../server/db/schema";
import { ALL_COLLECTION_ID, StoredCollectionStatus, StoredCollectionType, StoredProductSort } from "../../server/utils/storedCollection";

const migrationsFolder = fileURLToPath(new URL("../../server/db/migrations/postgresql", import.meta.url));

/** One in-memory Postgres per test file: starting PGlite is slow, so reset it between tests with `resetDb`. */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });

  return { db, close: () => client.close() };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

// Read from the schema so new tables are cleared without anyone remembering to add them
const tableNames = Object.values(schema)
  .filter(value => is(value, PgTable))
  .map(table => `"${getTableName(table)}"`)
  .join(", ");

/** Mirrors the row migration 0006 inserts; `collections.test.ts` checks the two agree. */
export const allCollectionRow = {
  id: ALL_COLLECTION_ID,
  title: "All products",
  handle: "all",
  type: StoredCollectionType.Automated,
  status: StoredCollectionStatus.Published,
  locked: true,
  description: "Every product in the shop, newest first.",
  rules: null,
  defaultSort: StoredProductSort.Newest,
} as const;

/** Empties every table, then puts back the All collection that the migrations insert, so each test starts like a fresh database. */
export async function resetDb(db: TestDb) {
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`));
  await db.insert(schema.collections).values(allCollectionRow);
}

export async function insertTestUser(db: TestDb, username = "tester") {
  const [user] = await db.insert(schema.users).values({ username }).returning();
  return user!;
}
