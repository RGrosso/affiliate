import { mockNuxtImport, registerEndpoint } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./auth";

// nuxt-auth-utils is pre-bundled in browser mode, so mockNuxtImport can't replace useUserSession.
// Its real session endpoint is mocked instead.
const server = vi.hoisted(() => ({
  session: {} as { user?: { id: string; username: string; role: string } },
  logoutCalls: 0,
}));

const addToast = vi.hoisted(() => vi.fn<(toast: { title?: string; color?: string }) => void>());
mockNuxtImport("useToast", () => () => ({ add: addToast }));

registerEndpoint("/api/_auth/session", () => server.session);
registerEndpoint("/api/auth/logout", {
  method: "POST",
  handler: () => {
    server.logoutCalls++;
    server.session = {};
    return { success: true, data: null };
  },
});

async function signIn(role: string) {
  server.session = { user: { id: "u1", username: "someone", role } };
  await useUserSession().fetch();
}

describe("useAuth", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    server.logoutCalls = 0;
    server.session = {};
    await useUserSession().fetch();
  });

  it("knows whether the user is an admin", async () => {
    expect(useAuth().isAdmin.value).toBe(false);

    await signIn("user");
    expect(useAuth().isAdmin.value).toBe(false);

    await signIn("admin");
    expect(useAuth().isAdmin.value).toBe(true);
  });

  it("logs out on the server, clears the session and confirms with a toast", async () => {
    await signIn("admin");

    await useAuth().logout();

    expect(server.logoutCalls).toBe(1);
    expect(useAuth().user.value).toBeNull();
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Logged out" }));
  });
});
