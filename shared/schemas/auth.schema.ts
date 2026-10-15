import { z } from "./zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export const usernameSchema = z
  .string({ error: "Please enter a username" })
  .trim()
  .min(1, "Please enter a username")
  .min(3, "Your username needs to be at least 3 characters")
  .max(20, "Your username can be at most 20 characters")
  .regex(/^[\w-]+$/, "Your username can only use letters, numbers, hyphens (-) and underscores (_)");

/** Rules for choosing a new password. Login only checks that one was entered. */
export const passwordSchema = z
  .string({ error: "Please enter a password" })
  .min(1, "Please enter a password")
  .min(PASSWORD_MIN_LENGTH, `Your password needs to be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Your password can be at most ${PASSWORD_MAX_LENGTH} characters`)
  .regex(/[A-Z]/, "Add at least one capital letter (A–Z)")
  .regex(/[a-z]/, "Add at least one lowercase letter (a–z)")
  .regex(/\d/, "Add at least one number (0–9)")
  .regex(/[^A-Za-z0-9]/, "Add at least one symbol, such as ! @ # $ % or &");

const confirmPasswordSchema = z.string({ error: "Please type your password again" }).min(1, "Please type your password again");

const passwordsMatch = (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword;

const passwordsMatchError = {
  message: "The passwords don't match",
  path: ["confirmPassword"],
};

export const loginSchema = z.object({
  username: z.string({ error: "Please enter your username" }).trim().min(1, "Please enter your username"),
  password: z.string({ error: "Please enter your password" }).min(1, "Please enter your password"),
});

export const setupUsernameSchema = z.object({
  username: usernameSchema,
});

export const setupPasswordSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(passwordsMatch, passwordsMatchError);

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password"),
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(passwordsMatch, passwordsMatchError);

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupUsernameInput = z.infer<typeof setupUsernameSchema>;
export type SetupPasswordInput = z.infer<typeof setupPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
