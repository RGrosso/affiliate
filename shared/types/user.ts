export enum UserState {
  /** Reserved for flows that need an account to be approved or confirmed first. */
  Pending = "pending",
  Active = "active",
  Disabled = "disabled",
  Deleted = "deleted",
}

export const userRoles = ["admin", "editor", "user"] as const;

export type UserRole = (typeof userRoles)[number];
