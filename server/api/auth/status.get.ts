import { isNotNull } from "drizzle-orm";
import { users } from "hub:db:schema";

/** Tells the login page whether anyone has finished setting up an account yet. */
export default defineApiHandler(async () => {
  const [account] = await db.select({ id: users.id })
    .from(users)
    .where(isNotNull(users.password))
    .limit(1);

  return ok({ hasAccounts: !!account });
});
