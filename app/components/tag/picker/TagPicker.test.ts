import { describe, expect, it, vi } from "vitest";
import { TagPicker } from "#components";
import type { Tag } from "#shared/types/tag";
import { expectAccessible } from "~~/test/nuxt/axe";
import { mountInApp } from "~~/test/nuxt/mount";

const tag = (id: string, name: string, icon: Tag["icon"] = null): Tag => ({
  id,
  name,
  slug: name.toLowerCase(),
  description: null,
  tooltip: null,
  icon,
  priority: null,
  showOnCards: true,
  showInFilter: false,
});

const tags = [tag("t2", "Sale", "percent"), tag("t1", "Bestseller", "trophy"), tag("t3", "Eco")];

// Menus are teleported to <body> and earlier tests' menus can linger, so only look at the newest one
const menu = () => [...document.body.querySelectorAll<HTMLElement>("[role=listbox]")].at(-1);
const options = () => [...(menu()?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
const optionNamed = (name: string) => options().find(el => el.textContent?.trim() === name);

async function open(props: Record<string, unknown> = {}) {
  const wrapper = await mountInApp(TagPicker, { tags, ...props });
  await wrapper.get("button[aria-haspopup=listbox]").trigger("click");
  await vi.waitFor(() => expect(document.body.querySelector("[role=listbox]")).not.toBeNull());
  return wrapper;
}

async function search(text: string) {
  const input = [...document.body.querySelectorAll<HTMLInputElement>("input[placeholder='Search or add tags']")].at(-1)!;
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

const modelUpdates = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.emitted("update:modelValue") ?? [];

describe("TagPicker", () => {
  it("has an accessible name for the control", async () => {
    const wrapper = await mountInApp(TagPicker, { tags });

    expect(wrapper.get("button[aria-haspopup=listbox]").attributes("aria-label")).toBe("Tags");
  });

  it("lists the tags sorted by name", async () => {
    await open();

    expect(options().map(el => el.textContent?.trim())).toEqual(["Bestseller", "Eco", "Sale"]);
  });

  it("adds a tag to the model when it is selected", async () => {
    const wrapper = await open({ modelValue: ["t1"] });

    optionNamed("Sale")!.click();
    await nextTick();

    expect(modelUpdates(wrapper).at(-1)).toEqual([["t1", "t2"]]);
  });

  it("removes a tag from the model when it is deselected", async () => {
    const wrapper = await open({ modelValue: ["t1", "t2"] });

    optionNamed("Bestseller")!.click();
    await nextTick();

    expect(modelUpdates(wrapper).at(-1)).toEqual([["t2"]]);
  });

  it("shows the selected tags as chips", async () => {
    const wrapper = await mountInApp(TagPicker, { tags, modelValue: ["t2", "t1"] });

    expect(wrapper.findAll("li").map(li => li.text())).toEqual(["Bestseller", "Sale"]);
  });

  it("removes a tag from the model when its chip is removed", async () => {
    const wrapper = await mountInApp(TagPicker, { tags, modelValue: ["t1", "t2"] });

    await wrapper.get("[aria-label='Remove Bestseller']").trigger("click");

    expect(modelUpdates(wrapper).at(-1)).toEqual([["t2"]]);
  });

  it("shows no chips when nothing is selected", async () => {
    const wrapper = await mountInApp(TagPicker, { tags });

    expect(wrapper.find("li").exists()).toBe(false);
  });

  it("offers to add a tag that doesn't exist, and emits the trimmed name", async () => {
    const wrapper = await open();

    await search("  Gift idea ");
    const create = optionNamed("Add \"Gift idea\"");
    expect(create).toBeDefined();

    create!.click();
    await nextTick();

    expect(wrapper.emitted("create")).toEqual([["Gift idea"]]);
  });

  it("doesn't offer to add a tag whose slug already exists", async () => {
    await open();

    await search("Eco");

    expect(options().map(el => el.textContent?.trim())).toEqual(["Eco"]);
  });

  it("doesn't offer to add a name with no usable characters", async () => {
    await open();

    await search("!!!");

    expect(options().some(el => el.textContent?.includes("Add"))).toBe(false);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountInApp(TagPicker, { tags, modelValue: ["t1", "t3"] }));
  });
});
