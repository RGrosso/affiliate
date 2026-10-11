export default defineApiHandler(async (event) => {
  await clearUserSession(event);
  return ok(null, "Logged out successfully");
});
