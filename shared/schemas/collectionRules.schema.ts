import {
  RetailerOperator,
  RuleMatch,
  RuleType,
  TagOperator,
  type CollectionRules
} from "../types/collectionRules";
import { countConditions } from "../utils/collectionRules";
import { z } from "./zod";

export const MAX_ITEMS_PER_GROUP = 20;
export const MAX_CONDITIONS = 50;

const match = z.enum(RuleMatch, { error: "Please choose whether all or any of the conditions must match" });
const unknownCondition = "Please choose a valid condition";

const tagRule = z.object({
  type: z.literal(RuleType.Tag),
  operator: z.enum(TagOperator, { error: "Please choose whether the product has the tag or not" }),
  tagId: z.uuid({ error: "Please choose a tag from the list" }),
});

const retailerRule = z.object({
  type: z.literal(RuleType.Retailer),
  operator: z.enum(RetailerOperator, { error: "Please choose whether the retailer is or isn't the one given" }),
  retailer: z
    .string({ error: "Please choose a retailer" })
    .trim()
    // Aborts so a blank retailer doesn't also get the length message
    .min(1, { error: "Please choose a retailer", abort: true })
    .max(100, "The retailer can be at most 100 characters"),
});

const rule = z.discriminatedUnion("type", [tagRule, retailerRule], { error: unknownCondition });

const subgroup = z.object({
  type: z.literal(RuleType.Group),
  match,
  rules: z
    .array(rule, { error: "Each group needs at least one condition" })
    .min(1, "Each group needs at least one condition")
    .max(MAX_ITEMS_PER_GROUP, `A group can have at most ${MAX_ITEMS_PER_GROUP} items`),
});

const rootItem = z.discriminatedUnion("type", [tagRule, retailerRule, subgroup], { error: unknownCondition });

export const collectionRulesSchema = z
  .object({
    match,
    rules: z
      .array(rootItem, { error: "Add at least one condition" })
      .min(1, "Add at least one condition")
      .max(MAX_ITEMS_PER_GROUP, `A collection can have at most ${MAX_ITEMS_PER_GROUP} items at the top level`),
  })
  .check((ctx) => {
    // Counts conditions inside groups too, so a few full groups can't get round the cap
    if (countConditions(ctx.value as CollectionRules) > MAX_CONDITIONS) {
      ctx.issues.push({
        code: "custom",
        message: `A collection can have at most ${MAX_CONDITIONS} conditions`,
        input: ctx.value,
        path: ["rules"],
      });
    }
  });

export type CollectionRulesInput = z.input<typeof collectionRulesSchema>;
export type CollectionRulesOutput = z.output<typeof collectionRulesSchema>;
