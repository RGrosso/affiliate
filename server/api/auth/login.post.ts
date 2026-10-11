import { eq } from "drizzle-orm";
import { users } from "@@/server/db/schema";
import { loginSchema } from "@@/schemas/auth.schema";
import type { LoginErrorData } from "@@/shared/types/auth";

export default defineEventHandler(async (event) => {
  const createAuthError = (code: LoginErrorData["code"], message: string) => {
    let statusCode = 401;
    if (code === "USER_NOT_FOUND") statusCode = 404;
    if (code === "INVALID_FORMAT") statusCode = 400;

    return createError({
      statusCode,
      statusMessage: message,
      data: { code, message } satisfies LoginErrorData,
    });
  };

  const body = await readValidatedBody(event, loginSchema.safeParse);

  if (!body.success) {
    throw createAuthError("INVALID_FORMAT", "Invalid username or password format");
  }

  const { username, password } = body.data;

  const [user] = await db.select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw createAuthError("USER_NOT_FOUND", "User not found");
  }

  const isPasswordValid = await verifyPassword(user.password, password);

  if (!isPasswordValid) {
    throw createAuthError("INVALID_CREDENTIALS", "Invalid credentials");
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    loggedInAt: Date.now(),
  });

  return { message: "Logged in successfully" };
});
