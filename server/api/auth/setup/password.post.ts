import { and, eq, isNull } from "drizzle-orm";
import { users } from "hub:db:schema";
import { setupPasswordSchema } from "#shared/schemas/auth.schema";

/** Step 2 of setup: save the chosen password and log the user in. */
export default defineApiHandler(async (event) => {
  const { username, password } = await readValidated(event, setupPasswordSchema);

  const user = await findUserAwaitingSetup(username);

  if (!user) {
    throw notFound("We couldn't find an account waiting to be set up with that username");
  }

  // `password IS NULL` guards against two setups racing for the same account
  const [updated] = await db.update(users)
    .set({ password: await hashPassword(password) })
    .where(and(eq(users.id, user.id), isNull(users.password)))
    .returning();

  if (!updated) {
    throw conflict("This account has already been set up. Please log in instead.");
  }

  const sessionUser = toSessionUser(updated);

  await setUserSession(event, {
    user: sessionUser,
    loggedInAt: Date.now(),
  });

  await seedSampleProductsForAdmin(sessionUser);

  return ok({ user: sessionUser }, "Your password has been saved");
});
