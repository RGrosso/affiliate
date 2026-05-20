export {};

declare module "#auth-utils" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: "admin" | "editor" | "user";
  }

  interface UserSession {
    id: string;
    email: string;
    name: string;
    role: "admin" | "editor" | "user";
  }
}
