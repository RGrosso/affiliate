import z from "zod";

export const addProductSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .min(1, "Title cannot be empty")
    .max(255, "Title is too long"),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable(),
});
