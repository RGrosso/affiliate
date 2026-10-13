import { describe, expect, it } from "vitest";
import { TagIconSelect } from "#components";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountInApp } from "~~/test/nuxt/mount";

describe("TagIconSelect", () => {
  it("shows 'No icon' when there is no icon", async () => {
    const wrapper = await mountInApp(TagIconSelect, { modelValue: null });

    expect(wrapper.text()).toContain("No icon");
  });

  it("shows the label of the chosen icon", async () => {
    const wrapper = await mountInApp(TagIconSelect, { modelValue: "zap" });

    expect(wrapper.text()).toContain("Lightning");
  });

  it("offers 'No icon' and every icon", async () => {
    const wrapper = await mountInApp(TagIconSelect);
    const select = wrapper.findComponent({ name: "USelect" });

    const values = (select.props("items") as { value: string }[]).map(item => item.value);

    expect(values).toHaveLength(12);
    expect(values[0]).toBe("none");
    expect(values).toContain("trophy");
  });

  it("updates the model with the icon key, or null for 'No icon'", async () => {
    const wrapper = await mountInApp(TagIconSelect, { modelValue: null });
    const select = wrapper.findComponent({ name: "USelect" });

    await select.vm.$emit("update:modelValue", "gift");
    await select.vm.$emit("update:modelValue", "none");

    expect(wrapper.emitted("update:modelValue")).toEqual([["gift"], [null]]);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountInApp(TagIconSelect, { modelValue: "heart" }));
  });
});
