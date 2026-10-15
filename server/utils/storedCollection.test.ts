import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { collections } from "hub:db:schema";
import { ALL_COLLECTION_HANDLE } from "#shared/types/collection";
import { allCollectionRow, createTestDb, type TestDb } from "../../test/setup/db";
import {
  ALL_COLLECTION_ID,
  StoredCollectionStatus,
  StoredCollectionType,
  StoredProductSort
} from "./storedCollection";

// Pins what is persisted. If one of these changes, existing rows need a migration: don't just update the test.
describe("stored collection values", () => {
  it("are the values in the database", () => {
    expect(StoredCollectionType).toEqual({ Manual: "manual", Automated: "automated" });
    expect(StoredCollectionStatus).toEqual({ Draft: "draft", Published: "published" });
    expect(StoredProductSort).toEqual({
      Newest: "newest",
      Oldest: "oldest",
      PriceAsc: "price_asc",
      PriceDesc: "price_desc",
      TitleAsc: "title_asc",
      TitleDesc: "title_desc",
      Manual: "manual",
    });
  });

  describe("in the migrated database", () => {
    let db: TestDb;
    let close: () => Promise<void>;

    beforeAll(async () => {
      ({ db, close } = await createTestDb());
    });

    afterAll(() => close());

    const enumValues = async (name: string) => {
      const { rows } = await db.execute<{ label: string }>(
        sql`select e.enumlabel as label from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = ${name} order by e.enumsortorder`
      );
      return rows.map(row => row.label);
    };

    it("match the Postgres enums", async () => {
      expect(await enumValues("collection_type")).toEqual(Object.values(StoredCollectionType));
      expect(await enumValues("collection_status")).toEqual(Object.values(StoredCollectionStatus));
      expect(await enumValues("product_sort")).toEqual(Object.values(StoredProductSort));
    });

    it("include the locked All collection that the migration inserts", async () => {
      const rows = await db.select().from(collections);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject(allCollectionRow);
      expect(rows[0]).toMatchObject({ id: ALL_COLLECTION_ID, handle: ALL_COLLECTION_HANDLE });
    });
  });
});
