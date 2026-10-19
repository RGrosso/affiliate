import { setupUsernameSchema } from "#shared/schemas/auth.schema";

/** Step 1 of setup: confirm the username belongs to an account that still needs a password. */
export default defineApiHandler(async event => {
  const { username } = await readValidated(event, setupUsernameSchema);

  const user = await findUserAwaitingSetup(username);

  if (!user) {
    throw notFound("We couldn't find an account waiting to be set up with that username");
  }

  return ok({ username: user.username });
});
