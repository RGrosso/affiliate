import { eq } from "drizzle-orm";
import { users } from "../../db/schema";
import { loginSchema } from "../../utils/auth.schema";

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.safeParse);

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid username or password format",
    });
  }

  const { username, password } = body.data;

  const [user] = await db.select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const isPasswordValid = user && await verifyPassword(user.password, password);
  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    },
    loggedInAt: new Date()
  });

  return { message: "Logged in successfully" };
});
