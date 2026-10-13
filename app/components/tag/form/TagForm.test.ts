import { setResponseStatus } from "h3";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagForm } from "#components";
import type { Tag } from "#shared/types/tag";
import { expectAccessible } from "~~/test/nuxt/axe";
import { readJsonBody } from "~~/test/nuxt/body";
import { mountInApp } from "~~/test/nuxt/mount";

const tag: Tag = {
  id: "t1",
  name: "Bestseller",
  slug: "bestseller",
  description: null,
  tooltip: "Popular",
  icon: "trophy",
  priority: 5,
  showOnCards: true,
};

const patches = vi.hoisted(() => [] as unknown[]);
const conflict = vi.hoisted(() => ({ on: false }));

registerEndpoint("/api/tags", () => ({ success: true, data: [] }));
registerEndpoint("/api/tags/t1", {
  method: "PATCH",
  handler: (event) => {
    patches.push(readJsonBody(event));
    if (conflict.on) {
      setResponseStatus(event, 409);
      return {
        success: false,
        code: "CONFLICT",
        message: "That tag already exists",
        fieldErrors: { name: ["A tag with this name already exists"] },
      };
    }
    return { success: true, data: tag };
  },
});

const field = (wrapper: VueWrapper, label: string) => {
  const labelEl = wrapper.findAll("label").find(el => el.text().replace("*", "").trim() === label);
  if (!labelEl) throw new Error(`No field labelled "${label}"`);
  return wrapper.get<HTMLInputElement>(`[id="${labelEl.attributes("for")}"]`);
};

describe("TagForm", () => {
  beforeEach(() => {
    patches.length = 0;
    conflict.on = false;
  });

  it("fills the fields from the tag", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    expect(field(wrapper, "Name").element.value).toBe("Bestseller");
    expect(field(wrapper, "Tooltip").element.value).toBe("Popular");
    expect(wrapper.text()).toContain("Trophy");
  });

  it("previews the tag as it's edited", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    await field(wrapper, "Name").setValue("Hot deal");

    const preview = wrapper.findComponent({ name: "CoreTag" });
    expect(preview.props()).toMatchObject({ label: "Hot deal", icon: "trophy", tooltip: "Popular" });
  });

  it("asks for a name when it's cleared", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    await field(wrapper, "Name").setValue("");
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("Please give the tag a name"));
    expect(patches).toEqual([]);
  });

  it("shows the length limit for a long tooltip", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    await field(wrapper, "Tooltip").setValue("a".repeat(151));
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("The tooltip can be at most 150 characters"));
  });

  it("sends the edited tag and emits saved", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    await field(wrapper, "Name").setValue("Top seller");
    await field(wrapper, "Tooltip").setValue("");
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.emitted("saved")).toHaveLength(1));
    expect(patches).toEqual([{ name: "Top seller", description: null, tooltip: null, icon: "trophy", priority: 5, showOnCards: true }]);
    expect(wrapper.emitted("saved")![0]).toEqual([tag]);
  });

  it("puts a duplicate name error on the name field", async () => {
    conflict.on = true;
    const wrapper = await mountInApp(TagForm, { tag });

    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("A tag with this name already exists"));
    expect(wrapper.emitted("saved")).toBeUndefined();
  });

  it("emits cancel", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    await wrapper.findAll("button").find(button => button.text() === "Cancel")!.trigger("click");

    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("is accessible", async () => {
    await expectAccessible(await mountInApp(TagForm, { tag }));
  });
});
