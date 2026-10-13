import { eq } from "drizzle-orm";
import { settings } from "hub:db:schema";

export class SettingsRepository {
  constructor(private readonly db: DbExecutor) {}

  async get(key: string) {
    const [setting] = await this.db.select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return setting;
  }

  async setIfMissing(key: string, value: string) {
    await this.db.insert(settings)
      .values({ key, value })
      .onConflictDoNothing();
  }
}
