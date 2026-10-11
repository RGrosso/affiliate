export {};

declare module "#auth-utils" {
  interface User {
    id: string;
    username: string;
    role: "admin" | "editor" | "user";
  }

  interface UserSession {
    loggedInAt: number;
  }
}
