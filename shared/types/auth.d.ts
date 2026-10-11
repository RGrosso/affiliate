import type { UserRole } from "./user";

declare module "#auth-utils" {
  interface User {
    id: string;
    username: string;
    role: UserRole;
  }

  interface UserSession {
    loggedInAt: number;
  }
}

export {};
