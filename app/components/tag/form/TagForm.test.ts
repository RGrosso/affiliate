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
const posts = vi.hoisted(() => [] as unknown[]);
const conflict = vi.hoisted(() => ({ on: false }));

const conflictResponse = (event: Parameters<typeof setResponseStatus>[0]) => {
  setResponseStatus(event, 409);
  return {
    success: false,
    code: "CONFLICT",
    message: "That tag already exists",
    fieldErrors: { name: ["A tag with this name already exists"] },
  };
};

registerEndpoint("/api/tags", {
  method: "GET",
  handler: () => ({ success: true, data: [] }),
});
registerEndpoint("/api/tags", {
  method: "POST",
  handler: (event) => {
    posts.push(readJsonBody(event));
    if (conflict.on) return conflictResponse(event);
    return { success: true, data: { ...tag, id: "t2", name: "Fresh", slug: "fresh" } };
  },
});
registerEndpoint("/api/tags/t1", {
  method: "PATCH",
  handler: (event) => {
    patches.push(readJsonBody(event));
    if (conflict.on) return conflictResponse(event);
    return { success: true, data: tag };
  },
});

const button = (wrapper: VueWrapper, label: string) => {
  const found = wrapper.findAll("button").find(el => el.text() === label);
  if (!found) throw new Error(`No button labelled "${label}"`);
  return found;
};

const field = (wrapper: VueWrapper, label: string) => {
  const labelEl = wrapper.findAll("label").find(el => el.text().replace("*", "").trim() === label);
  if (!labelEl) throw new Error(`No field labelled "${label}"`);
  return wrapper.get<HTMLInputElement>(`[id="${labelEl.attributes("for")}"]`);
};

describe("TagForm", () => {
  beforeEach(() => {
    patches.length = 0;
    posts.length = 0;
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

  it("shows the save bar only once something changes", async () => {
    const wrapper = await mountInApp(TagForm, { tag });
    expect(wrapper.text()).not.toContain("Unsaved changes");

    await field(wrapper, "Name").setValue("Top seller");
    expect(wrapper.text()).toContain("Unsaved changes");

    await field(wrapper, "Name").setValue("Bestseller");
    expect(wrapper.text()).not.toContain("Unsaved changes");
  });

  it("sends the edited tag and emits saved", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    await field(wrapper, "Name").setValue("Top seller");
    await field(wrapper, "Tooltip").setValue("");
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.emitted("saved")).toHaveLength(1));
    expect(patches).toEqual([{ name: "Top seller", description: null, tooltip: null, icon: "trophy", priority: 5, showOnCards: true }]);
    expect(wrapper.emitted("saved")![0]).toEqual([tag]);
    await vi.waitFor(() => expect(wrapper.text()).not.toContain("Unsaved changes"));
  });

  it("creates a tag when there isn't one to edit", async () => {
    const wrapper = await mountInApp(TagForm);
    expect(wrapper.text()).toContain("Tag name");

    await field(wrapper, "Name").setValue("Fresh");
    expect(wrapper.text()).toContain("Unsaved tag");
    await field(wrapper, "Description").setValue("Just in");
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.emitted("saved")).toHaveLength(1));
    expect(posts).toEqual([{ name: "Fresh", description: "Just in", tooltip: null, icon: null, priority: null, showOnCards: false }]);
    expect(patches).toEqual([]);
    expect(wrapper.emitted("saved")![0]).toMatchObject([{ id: "t2", name: "Fresh" }]);
  });

  it("asks for a name when creating without one", async () => {
    const wrapper = await mountInApp(TagForm);

    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("Please give the tag a name"));
    expect(posts).toEqual([]);
  });

  it("puts a duplicate name error on the name field when creating", async () => {
    conflict.on = true;
    const wrapper = await mountInApp(TagForm);

    await field(wrapper, "Name").setValue("Bestseller");
    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("A tag with this name already exists"));
    expect(wrapper.emitted("saved")).toBeUndefined();
  });

  it("puts a duplicate name error on the name field", async () => {
    conflict.on = true;
    const wrapper = await mountInApp(TagForm, { tag });

    await wrapper.get("form").trigger("submit");

    await vi.waitFor(() => expect(wrapper.text()).toContain("A tag with this name already exists"));
    expect(wrapper.emitted("saved")).toBeUndefined();
  });

  it("puts the edits back when cancelled", async () => {
    const wrapper = await mountInApp(TagForm, { tag });

    await field(wrapper, "Name").setValue("Top seller");
    await button(wrapper, "Cancel").trigger("click");

    expect(field(wrapper, "Name").element.value).toBe("Bestseller");
    expect(wrapper.text()).not.toContain("Unsaved changes");
  });

  it("is accessible", async () => {
    await expectAccessible(await mountInApp(TagForm, { tag }));
  });

  it("is accessible when creating", async () => {
    const wrapper = await mountInApp(TagForm);
    await field(wrapper, "Name").setValue("Fresh");

    await expectAccessible(wrapper);
  });
});
