import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, resetDb, type TestDb } from "../../test/setup/db";
import { SettingsRepository } from "./SettingsRepository";

let db: TestDb;
let close: () => Promise<void>;
let repo: SettingsRepository;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  repo = new SettingsRepository(db);
});

afterAll(() => close());

beforeEach(() => resetDb(db));

describe("get", () => {
  it("returns undefined for an unknown key", async () => {
    expect(await repo.get("missing")).toBeUndefined();
  });

  it("returns the stored row", async () => {
    await repo.setIfMissing("theme", "dark");

    expect(await repo.get("theme")).toMatchObject({ key: "theme", value: "dark" });
  });
});

describe("setIfMissing", () => {
  it("does not overwrite an existing value", async () => {
    await repo.setIfMissing("theme", "dark");
    await repo.setIfMissing("theme", "light");

    expect((await repo.get("theme"))?.value).toBe("dark");
  });
});
