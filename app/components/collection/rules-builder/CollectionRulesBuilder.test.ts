import { describe, expect, it } from "vitest";
import { CollectionRulesBuilder } from "#components";
import { RetailerOperator, RuleMatch, RuleType, TagOperator } from "#shared/types/collectionRules";
import type { DraftCondition, DraftGroup, DraftRules } from "~/utils/collectionRulesDraft";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountWithModel } from "~~/test/nuxt/mount";
import { byLabel, choose, openMenu, optionTexts, pick, searchMenu } from "~~/test/nuxt/select";

const SALE_ID = "0b6e2f1c-8a4d-4f7e-9c1a-3d5b7e9f1a2b";
const ECO_ID = "5c1d9e3a-2b7f-4a68-8d0e-6f4a2c8b1e90";

const tags = [
  { id: SALE_ID, name: "Sale" },
  { id: ECO_ID, name: "Eco" },
];

const tagRow = (key: string, tagId = ""): DraftCondition => ({ key, type: RuleType.Tag, operator: TagOperator.Has, tagId, retailer: "" });

function mountBuilder(initial: DraftRules = { match: RuleMatch.All, rules: [tagRow("a")] }) {
  return mountWithModel<DraftRules>(CollectionRulesBuilder, initial, { tags, retailers: ["Amazon", "Argos"] });
}

const labels = (wrapper: Awaited<ReturnType<typeof mountBuilder>>["wrapper"]) =>
  [...wrapper.element.querySelectorAll("[aria-label]")].map(el => el.getAttribute("aria-label"));

describe("CollectionRulesBuilder", () => {
  it("is accessible", async () => {
    const { wrapper } = await mountBuilder({
      match: RuleMatch.Any,
      rules: [tagRow("a", SALE_ID), { key: "g", type: RuleType.Group, match: RuleMatch.All, rules: [tagRow("b")] }],
    });

    await expectAccessible(wrapper);
  });

  it("shows the match mode and one row per condition", async () => {
    const { wrapper } = await mountBuilder({ match: RuleMatch.Any, rules: [tagRow("a"), tagRow("b")] });

    expect(wrapper.text()).toContain("Products must match");
    expect(byLabel(wrapper, "Match all or any conditions").textContent).toContain("any");
    expect(labels(wrapper)).toEqual(expect.arrayContaining(["Condition 1 type", "Condition 2 type"]));
  });

  it("adds a condition", async () => {
    const { wrapper, model } = await mountBuilder();

    await wrapper
      .findAll("button")
      .find(button => button.text() === "Add condition")!
      .trigger("click");

    expect(model.value.rules).toHaveLength(2);
    expect(model.value.rules[1]).toMatchObject({ type: RuleType.Tag, operator: TagOperator.Has, tagId: "" });
    expect(model.value.rules[1]!.key).not.toBe(model.value.rules[0]!.key);
  });

  it("removes a condition", async () => {
    const { wrapper, model } = await mountBuilder({ match: RuleMatch.All, rules: [tagRow("a"), tagRow("b")] });

    byLabel(wrapper, "Remove condition 1").click();
    await nextTick();

    expect(model.value.rules.map(item => item.key)).toEqual(["b"]);
  });

  it("changes between all and any", async () => {
    const { wrapper, model } = await mountBuilder();

    await choose(wrapper, "Match all or any conditions", "any");

    expect(model.value.match).toBe(RuleMatch.Any);
  });

  it("adds a group with its own condition, and adds and removes conditions inside it", async () => {
    const { wrapper, model } = await mountBuilder();

    await wrapper
      .findAll("button")
      .find(button => button.text() === "Add group")!
      .trigger("click");
    const group = model.value.rules[1]!;
    expect(group).toMatchObject({ type: RuleType.Group, match: RuleMatch.All, rules: [{ type: RuleType.Tag }] });
    expect(labels(wrapper)).toEqual(expect.arrayContaining(["Group 2 match all or any", "Group 2 condition 1 type"]));

    await wrapper
      .findAll("button")
      .find(button => button.text() === "Add condition to group 2")!
      .trigger("click");
    expect(model.value.rules[1] as DraftGroup).toMatchObject({ rules: [{}, {}] });

    byLabel(wrapper, "Remove group 2 condition 1").click();
    await nextTick();
    expect((model.value.rules[1] as DraftGroup).rules).toHaveLength(1);
  });

  it("changes a group between all and any", async () => {
    const { wrapper, model } = await mountBuilder({
      match: RuleMatch.All,
      rules: [{ key: "g", type: RuleType.Group, match: RuleMatch.All, rules: [tagRow("b")] }],
    });

    await choose(wrapper, "Group 1 match all or any", "any");

    expect((model.value.rules[0] as DraftGroup).match).toBe(RuleMatch.Any);
  });

  it("removes a group", async () => {
    const { wrapper, model } = await mountBuilder({
      match: RuleMatch.All,
      rules: [tagRow("a"), { key: "g", type: RuleType.Group, match: RuleMatch.All, rules: [tagRow("b")] }],
    });

    byLabel(wrapper, "Remove group 2").click();
    await nextTick();

    expect(model.value.rules.map(item => item.key)).toEqual(["a"]);
  });

  it("only offers groups at the top level", async () => {
    const { wrapper } = await mountBuilder({ match: RuleMatch.All, rules: [{ key: "g", type: RuleType.Group, match: RuleMatch.All, rules: [tagRow("b")] }] });

    expect(wrapper.findAll("button").filter(button => button.text() === "Add group")).toHaveLength(1);
  });

  it("picks a tag from the tag list, sorted by name", async () => {
    const { wrapper, model } = await mountBuilder();

    await openMenu(wrapper, "Condition 1 tag");
    expect(optionTexts()).toEqual(["Eco", "Sale"]);
    await pick("Sale");

    expect(model.value.rules[0]).toMatchObject({ type: RuleType.Tag, tagId: SALE_ID });
  });

  it("changes the operator", async () => {
    const { wrapper, model } = await mountBuilder({ match: RuleMatch.All, rules: [tagRow("a", SALE_ID)] });

    await choose(wrapper, "Condition 1 operator", "doesn't have");

    expect(model.value.rules[0]).toMatchObject({ operator: TagOperator.HasNot, tagId: SALE_ID });
  });

  it("switches a row to a retailer condition, resetting its operator and value", async () => {
    const { wrapper, model } = await mountBuilder({ match: RuleMatch.All, rules: [{ ...tagRow("a", SALE_ID), operator: TagOperator.HasNot }] });

    await choose(wrapper, "Condition 1 type", "Retailer");

    expect(model.value.rules[0]).toMatchObject({ key: "a", type: RuleType.Retailer, operator: RetailerOperator.Is, tagId: "", retailer: "" });
    expect(byLabel(wrapper, "Condition 1 retailer")).toBeTruthy();
    expect(wrapper.element.querySelector("[aria-label='Condition 1 tag']")).toBeNull();
  });

  it("offers the known retailers and the retailer operators", async () => {
    const { wrapper, model } = await mountBuilder({
      match: RuleMatch.All,
      rules: [{ key: "a", type: RuleType.Retailer, operator: RetailerOperator.Is, tagId: "", retailer: "" }],
    });

    await choose(wrapper, "Condition 1 operator", "isn't");
    expect(model.value.rules[0]).toMatchObject({ operator: RetailerOperator.IsNot });

    await openMenu(wrapper, "Condition 1 retailer");
    expect(optionTexts()).toEqual(["Amazon", "Argos"]);
    await pick("Argos");
    expect(model.value.rules[0]).toMatchObject({ retailer: "Argos" });
  });

  it("lets a retailer that no product has yet be typed in", async () => {
    const { wrapper, model } = await mountBuilder({
      match: RuleMatch.All,
      rules: [{ key: "a", type: RuleType.Retailer, operator: RetailerOperator.Is, tagId: "", retailer: "" }],
    });

    await openMenu(wrapper, "Condition 1 retailer");
    await searchMenu("Currys");
    await pick('Use "Currys"');

    expect(model.value.rules[0]).toMatchObject({ retailer: "Currys" });
    expect(byLabel(wrapper, "Condition 1 retailer").textContent).toContain("Currys");
  });
});
