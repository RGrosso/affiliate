import type { H3Event } from "h3";
import type { User } from "#auth-utils";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { users, type UserRow } from "hub:db:schema";
import { UserState } from "#shared/types/user";

export function toSessionUser(user: UserRow): User {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export async function findUserByUsername(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  return user;
}

/** An active user who hasn't chosen a password yet (e.g. the seeded dev admin). */
export async function findUserAwaitingSetup(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username), isNull(users.password), eq(users.state, UserState.Active)))
    .limit(1);

  return user;
}

/**
 * The session cookie is stateless, so it can outlive the user it points at
 * (e.g. after a DB reset). Returns the user only if they can still log in.
 */
export async function findSessionUser(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNotNull(users.password), eq(users.state, UserState.Active)))
    .limit(1);

  return user;
}

export async function requireUser(event: H3Event) {
  const session = await getUserSession(event);
  const user = session.user && (await findSessionUser(session.user.id));

  if (!user) {
    if (session.user) {
      await clearUserSession(event);
    }
    throw unauthorized();
  }

  return { ...session, user: toSessionUser(user) };
}

export async function requireAdmin(event: H3Event) {
  const session = await requireUser(event);

  if (session.user.role !== "admin") {
    throw forbidden("You need to be an admin to do that");
  }

  return session;
}
