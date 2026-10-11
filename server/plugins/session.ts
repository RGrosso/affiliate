/**
 * Runs whenever the app loads the session (SSR and `useUserSession().fetch()`).
 * Logs the user out if their account no longer exists or can't log in, and
 * keeps the username and role in the cookie in sync with the database.
 */
export default defineNitroPlugin(() => {
  sessionHooks.hook("fetch", async (session, event) => {
    if (!session.user) return;

    const user = await findSessionUser(session.user.id);

    if (!user) {
      await clearUserSession(event);

      // The endpoint returns this same object, so empty it to log the client out too
      for (const key of Object.keys(session)) {
        Reflect.deleteProperty(session, key);
      }
      return;
    }

    const freshUser = toSessionUser(user);

    if (freshUser.username !== session.user.username || freshUser.role !== session.user.role) {
      await setUserSession(event, { user: freshUser, loggedInAt: session.loggedInAt });
      session.user = freshUser;
    }
  });
});
