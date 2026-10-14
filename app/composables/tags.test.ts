import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import type { AdminTag } from "#shared/types/tag";
import { readJsonBody } from "~~/test/nuxt/body";
import { useTags } from "./tags";

const tag: AdminTag = {
  id: "t1",
  name: "Bestseller",
  slug: "bestseller",
  description: null,
  tooltip: null,
  icon: null,
  priority: null,
  showOnCards: false,
  productCount: 2,
};

const calls = vi.hoisted(() => ({ list: 0, deleted: 0, bodies: [] as unknown[] }));

registerEndpoint("/api/tags", {
  method: "GET",
  handler: () => {
    calls.list++;
    return { success: true, data: [tag] };
  },
});
registerEndpoint("/api/tags", {
  method: "POST",
  handler: (event) => {
    calls.bodies.push(readJsonBody(event));
    return { success: true, data: { ...tag, id: "t2", name: "New", slug: "new" } };
  },
});
registerEndpoint("/api/tags/t1", {
  method: "PATCH",
  handler: (event) => {
    calls.bodies.push(readJsonBody(event));
    return { success: true, data: { ...tag, name: "Renamed" } };
  },
});
registerEndpoint("/api/tags/t1", {
  method: "DELETE",
  handler: () => {
    calls.deleted++;
    return { success: true, data: null };
  },
});

// Outside a component nothing stops the composable's watchers, so each test gets a scope that's stopped afterwards
// Outside a component nothing stops the composable's watchers, so each test gets a scope that's stopped afterwards
let scope = effectScope();
const tagsComposable = () => scope.run(() => useTags())!;

describe("useTags", () => {
  beforeEach(() => {
    calls.bodies.length = 0;
    scope = effectScope();
    calls.list = 0;
    calls.deleted = 0;
  });

  afterEach(() => scope.stop());

  it("lists the tags", async () => {
    const { tags } = tagsComposable();

    await vi.waitFor(() => expect(tags.value).toEqual([tag]));
  });

  it("creates a tag from its name, then refreshes the list", async () => {
    const { tags, create } = tagsComposable();
    await vi.waitFor(() => expect(tags.value).toHaveLength(1));
    const listed = calls.list;

    const created = await create("New");

    expect(calls.bodies).toEqual([{ name: "New" }]);
    expect(created.name).toBe("New");
    expect(calls.list).toBe(listed + 1);
  });

  it("creates a tag with its details", async () => {
    const { create } = tagsComposable();

    await create({ name: "New", icon: "star", showOnCards: true });

    expect(calls.bodies).toEqual([{ name: "New", icon: "star", showOnCards: true }]);
  });

  it("updates a tag with a PATCH", async () => {
    const { update } = tagsComposable();

    const updated = await update("t1", { name: "Renamed", priority: 3 });

    expect(calls.bodies).toEqual([{ name: "Renamed", priority: 3 }]);
    expect(updated.name).toBe("Renamed");
  });

  it("removes a tag, then refreshes the list", async () => {
    const { tags, remove } = tagsComposable();
    await vi.waitFor(() => expect(tags.value).toHaveLength(1));
    const listed = calls.list;

    await remove("t1");

    expect(calls.deleted).toBe(1);
    expect(calls.list).toBe(listed + 1);
  });
});
