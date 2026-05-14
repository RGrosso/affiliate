import { z } from "zod";

const minLengthErrorMessage = (length: number) => `Password must be at least ${length} characters`;
const maxLengthErrorMessage = (length: number) => `Password must be at most ${length} characters`;
const uppercaseErrorMessage = "Password must contain at least one uppercase letter";
const lowercaseErrorMessage = "Password must contain at least one lowercase letter";
const numberErrorMessage = "Password must contain at least one number";
const specialCharacterErrorMessage = "Password must contain at least one special character (!@#$%^&*)";
const passwordMismatchErrorMessage = "Passwords do not match";

const passwordSchema = z.string()
  .min(8, { message: minLengthErrorMessage(8) })
  .max(20, { message: maxLengthErrorMessage(20) })
  .refine(password => /[A-Z]/.test(password), {
    message: uppercaseErrorMessage,
  })
  .refine(password => /[a-z]/.test(password), {
    message: lowercaseErrorMessage,
  })
  .refine(password => /[0-9]/.test(password), { message: numberErrorMessage })
  .refine(password => /[!@#$%^&*]/.test(password), {
    message: specialCharacterErrorMessage,
  });

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters"),
  password: passwordSchema,
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: passwordMismatchErrorMessage,
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
