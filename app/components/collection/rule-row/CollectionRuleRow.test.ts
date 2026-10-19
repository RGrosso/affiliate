import { describe, expect, it } from "vitest";
import { CollectionRuleRow } from "#components";
import { RetailerOperator, RuleType, TagOperator } from "#shared/types/collectionRules";
import type { DraftCondition } from "~/utils/collectionRulesDraft";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountInApp, mountWithModel } from "~~/test/nuxt/mount";
import { byLabel, choose } from "~~/test/nuxt/select";

const SALE_ID = "0b6e2f1c-8a4d-4f7e-9c1a-3d5b7e9f1a2b";

const tags = [{ id: SALE_ID, name: "Sale" }];
const props = { name: "rules.rules.0", label: "Condition 1", tags, retailers: ["Amazon"] };

const tagRow: DraftCondition = { key: "a", type: RuleType.Tag, operator: TagOperator.Has, tagId: SALE_ID, retailer: "" };
const retailerRow: DraftCondition = { key: "a", type: RuleType.Retailer, operator: RetailerOperator.Is, tagId: "", retailer: "Amazon" };

describe("CollectionRuleRow", () => {
  it.each([
    ["a tag", tagRow],
    ["a retailer", retailerRow],
  ])("is accessible for %s", async (_, condition) => {
    await expectAccessible(await mountInApp(CollectionRuleRow, { ...props, modelValue: condition }));
  });

  it("shows the chosen tag name and the operator", async () => {
    const wrapper = await mountInApp(CollectionRuleRow, { ...props, modelValue: tagRow });

    expect(byLabel(wrapper, "Condition 1 type").textContent).toContain("Tag");
    expect(byLabel(wrapper, "Condition 1 operator").textContent).toContain("has");
    expect(byLabel(wrapper, "Condition 1 tag").textContent).toContain("Sale");
  });

  it("shows the retailer for a retailer condition", async () => {
    const wrapper = await mountInApp(CollectionRuleRow, { ...props, modelValue: retailerRow });

    expect(byLabel(wrapper, "Condition 1 operator").textContent).toContain("is");
    expect(byLabel(wrapper, "Condition 1 retailer").textContent).toContain("Amazon");
  });

  it("asks the parent to remove the row", async () => {
    const wrapper = await mountInApp(CollectionRuleRow, { ...props, modelValue: tagRow });

    byLabel(wrapper, "Remove condition 1").click();

    expect(wrapper.emitted("remove")).toHaveLength(1);
  });

  it("offers only the operators of its type", async () => {
    const { wrapper, model } = await mountWithModel<DraftCondition>(CollectionRuleRow, retailerRow, props);

    await choose(wrapper, "Condition 1 operator", "isn't");

    expect(model.value.operator).toBe(RetailerOperator.IsNot);
  });
});
