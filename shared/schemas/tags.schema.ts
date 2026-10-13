import { tagIcons } from "../types/tag";
import { slugify } from "../utils/slugify";
import { z } from "./zod";

const emptyToNull = (value: unknown) => (value === "" ? null : value);

const tagName = z
  .string({ error: "Please give the tag a name" })
  .trim()
  // Aborts so a blank name doesn't also get the letters-or-numbers message
  .min(1, { error: "Please give the tag a name", abort: true })
  .max(50, "The tag name can be at most 50 characters")
  // The slug decides whether a tag already exists, so it can't be empty
  .refine(name => slugify(name) !== "", "Please use at least one letter or number in the tag name");

export const createTagSchema = z.object({
  name: tagName,
});

// No defaults: a PATCH changes only the fields it sends, so a missing field must stay missing
export const updateTagSchema = z.object({
  name: tagName.optional(),
  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(500, "The description can be at most 500 characters").nullable().optional()
  ),
  tooltip: z.preprocess(
    emptyToNull,
    z.string().trim().max(150, "The tooltip can be at most 150 characters").nullable().optional()
  ),
  icon: z.enum(tagIcons, { error: "Please choose one of the icons" }).nullable().optional(),
  priority: z
    .number({ error: "The priority must be a number" })
    .int("The priority must be a whole number")
    .min(-10_000, "The priority can't be below -10,000")
    .max(10_000, "The priority can be at most 10,000")
    .nullable()
    .optional(),
  showOnCards: z.boolean().optional(),
});

export type CreateTagInput = z.input<typeof createTagSchema>;
export type UpdateTagInput = z.input<typeof updateTagSchema>;
