import { loginSchema } from "#shared/schemas/auth.schema";
import { UserState } from "#shared/types/user";

const invalidCredentials = () =>
  apiError("INVALID_CREDENTIALS", "That username and password don't match. Please try again.");

export default defineApiHandler(async (event) => {
  const { username, password } = await readValidated(event, loginSchema);

  const user = await findUserByUsername(username);

  if (!user || user.state === UserState.Deleted) {
    throw invalidCredentials();
  }

  if (user.password === null) {
    if (user.state !== UserState.Active) {
      throw invalidCredentials();
    }

    throw apiError("SETUP_REQUIRED", "You need to choose a password before you can log in");
  }

  if (!(await verifyPassword(user.password, password))) {
    throw invalidCredentials();
  }

  // Only reveal the account's state once the password has been confirmed
  if (user.state === UserState.Disabled) {
    throw apiError("ACCOUNT_DISABLED", "This account has been disabled. Please contact an administrator.");
  }

  if (user.state !== UserState.Active) {
    throw forbidden("This account isn't active yet");
  }

  const sessionUser = toSessionUser(user);

  await setUserSession(event, {
    user: sessionUser,
    loggedInAt: Date.now(),
  });

  await seedSampleProductsForAdmin(sessionUser);

  return ok({ user: sessionUser }, "Logged in successfully");
});
