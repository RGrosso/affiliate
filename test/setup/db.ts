import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../server/db/schema";

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

export async function resetDb(db: TestDb) {
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`));
}

export async function insertTestUser(db: TestDb, username = "tester") {
  const [user] = await db.insert(schema.users).values({ username }).returning();
  return user!;
}
