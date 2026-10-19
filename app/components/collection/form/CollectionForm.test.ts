import type { VueWrapper } from "@vue/test-utils";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { setResponseStatus } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionForm, UApp } from "#components";
import { CollectionStatus, CollectionType, ProductSort, type AdminCollection } from "#shared/types/collection";
import { RuleMatch, RuleType, TagOperator } from "#shared/types/collectionRules";
import type { ProductListItem } from "#shared/types/product";
import { expectAccessible } from "~~/test/nuxt/axe";
import { readJsonBody } from "~~/test/nuxt/body";
import { choose } from "~~/test/nuxt/select";

const LAMP_ID = "7d3f1b52-9c6e-4a08-b5d4-1e2f3a4b5c6d";
const SALE_ID = "0b6e2f1c-8a4d-4f7e-9c1a-3d5b7e9f1a2b";

const tag = {
  id: SALE_ID,
  name: "Sale",
  slug: "sale",
  description: null,
  tooltip: null,
  icon: null,
  priority: null,
  showOnCards: true,
  showInFilter: false,
  productCount: 0,
  collections: [],
};

const lamp: ProductListItem = {
  id: LAMP_ID,
  title: "Moon Lamp",
  handle: "moon-lamp",
  description: null,
  pricePence: 2499,
  retailer: null,
  affiliateUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  image: null,
  tags: [],
};

const manual: AdminCollection = {
  id: "c1",
  title: "Gifts",
  handle: "gifts",
  type: CollectionType.Manual,
  status: CollectionStatus.Draft,
  locked: false,
  description: "Ideas for everyone",
  imageUrl: null,
  imageAlt: null,
  seoTitle: null,
  seoDescription: null,
  defaultSort: ProductSort.Manual,
  rules: null,
  productIds: [LAMP_ID],
};

const automatic: AdminCollection = {
  ...manual,
  id: "c2",
  title: "On sale",
  handle: "on-sale",
  type: CollectionType.Automated,
  defaultSort: ProductSort.Newest,
  rules: { match: RuleMatch.All, rules: [{ type: RuleType.Tag, operator: TagOperator.Has, tagId: SALE_ID }] },
  productIds: [],
};

const locked: AdminCollection = {
  ...automatic,
  id: "c3",
  title: "All products",
  handle: "all",
  locked: true,
  status: CollectionStatus.Published,
  rules: null,
};

const requests = vi.hoisted(() => ({
  posts: [] as Record<string, unknown>[],
  patches: [] as Record<string, unknown>[],
  failWith: null as null | Record<string, string[]>,
}));

const conflict = (event: Parameters<typeof setResponseStatus>[0]) => {
  setResponseStatus(event, 400);
  return { success: false, code: "VALIDATION_ERROR", message: "Please check the highlighted fields and try again", fieldErrors: requests.failWith };
};

registerEndpoint("/api/tags", () => ({ success: true, data: [tag] }));
registerEndpoint("/api/products/retailers", () => ({ success: true, data: ["Amazon"] }));
registerEndpoint("/api/collections/preview", { method: "POST", handler: () => ({ success: true, data: { total: 23, items: [lamp] } }) });
registerEndpoint("/api/collections", {
  method: "POST",
  handler: event => {
    requests.posts.push(readJsonBody(event) as Record<string, unknown>);
    return requests.failWith ? conflict(event) : { success: true, data: manual };
  },
});
for (const id of ["c1", "c2", "c3"]) {
  registerEndpoint(`/api/collections/${id}`, {
    method: "PATCH",
    handler: event => {
      requests.patches.push(readJsonBody(event) as Record<string, unknown>);
      return requests.failWith ? conflict(event) : { success: true, data: { ...manual, id, title: "Saved" } };
    },
  });
}

const field = (wrapper: VueWrapper, label: string) => {
  const labelEl = wrapper.findAll("label").find(el => el.text().replace("*", "").trim() === label);
  if (!labelEl) throw new Error(`No field labelled "${label}"`);
  return wrapper.get<HTMLInputElement>(`[id="${labelEl.attributes("for")}"]`);
};

const radio = (wrapper: VueWrapper, label: string) => {
  const found = wrapper.findAll("[role=radio]").find(el => el.element.closest("div")?.parentElement?.textContent?.includes(label));
  if (!found) throw new Error(`No option "${label}"`);
  return found;
};

// Each form registers a router guard, so unmount them or an earlier test's dirty form would prompt in later ones
const apps: { unmount: () => void }[] = [];

async function mountForm(props: Record<string, unknown> = {}) {
  const app = await mountSuspended({ render: () => h(UApp, null, { default: () => h(CollectionForm, props) }) });
  apps.push(app);
  return app.findComponent(CollectionForm);
}

const headings = (wrapper: VueWrapper) => wrapper.findAll("h2").map(h => h.text());

describe("CollectionForm", () => {
  beforeEach(() => {
    requests.posts.length = 0;
    requests.patches.length = 0;
    requests.failWith = null;
  });

  afterEach(() => {
    apps.splice(0).forEach(app => app.unmount());
  });

  it("is accessible when creating, editing and locked", async () => {
    await expectAccessible(await mountForm());
    await expectAccessible(await mountForm({ collection: automatic }));
    await expectAccessible(await mountForm({ collection: locked }));
  });

  describe("creating", () => {
    it("starts as a hand-picked collection with a Products card and no conditions", async () => {
      const wrapper = await mountForm();

      expect(headings(wrapper)).toEqual(expect.arrayContaining(["Products (0)", "Cover image", "Search listing", "Default sort"]));
      expect(headings(wrapper)).not.toContain("Conditions");
      expect(wrapper.text()).toContain("No products yet.");
    });

    it("shows the conditions and preview, not the products, for an automatic collection", async () => {
      const wrapper = await mountForm();

      await radio(wrapper, "Automatic").trigger("click");

      await vi.waitFor(() => expect(headings(wrapper)).toEqual(expect.arrayContaining(["Conditions", "Preview"])));
      expect(headings(wrapper).some(text => text.startsWith("Products"))).toBe(false);
      expect(wrapper.find("ul[aria-label=Conditions]").exists()).toBe(true);
    });

    it("only offers manual order for a hand-picked collection", async () => {
      const wrapper = await mountForm();
      expect(wrapper.get("[aria-label='Default sort']").text()).toContain("Featured (manual order)");

      await radio(wrapper, "Automatic").trigger("click");

      await vi.waitFor(() => expect(wrapper.get("[aria-label='Default sort']").text()).toContain("Newest first"));
    });

    it("fills the handle from the title until it is edited", async () => {
      const wrapper = await mountForm();
      await wrapper
        .findAll("button")
        .find(button => button.text() === "Edit")!
        .trigger("click");

      await field(wrapper, "Title").setValue("Summer Sale!");
      expect(field(wrapper, "URL handle").element.value).toBe("summer-sale");

      await field(wrapper, "URL handle").setValue("my-sale");
      await field(wrapper, "Title").setValue("Winter Sale");
      expect(field(wrapper, "URL handle").element.value).toBe("my-sale");
    });

    it("counts the characters in the description", async () => {
      const wrapper = await mountForm();
      expect(wrapper.text()).toContain("0 of 500 characters used");

      await field(wrapper, "Description").setValue("Hello");

      expect(wrapper.text()).toContain("5 of 500 characters used");
    });

    it("asks for a title, and for each condition to be finished, when saved empty", async () => {
      const wrapper = await mountForm();
      await radio(wrapper, "Automatic").trigger("click");
      await vi.waitFor(() => expect(wrapper.find("ul[aria-label=Conditions]").exists()).toBe(true));

      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(wrapper.text()).toContain("Please give the collection a title"));
      expect(wrapper.text()).toContain("Please choose a tag from the list");
      expect(requests.posts).toHaveLength(0);
    });

    it("saves a hand-picked collection with its title and no rules", async () => {
      const wrapper = await mountForm();
      await field(wrapper, "Title").setValue("Gifts");

      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(requests.posts).toHaveLength(1));
      expect(requests.posts[0]).toMatchObject({ type: CollectionType.Manual, title: "Gifts", handle: "gifts", status: CollectionStatus.Draft, productIds: [] });
      expect(requests.posts[0]).not.toHaveProperty("rules");
    });

    it("saves an automatic collection with its rules, without the client-side keys", async () => {
      const wrapper = await mountForm();
      await radio(wrapper, "Automatic").trigger("click");
      await field(wrapper, "Title").setValue("On sale");
      await vi.waitFor(() => expect(wrapper.find("[aria-label='Condition 1 tag']").exists()).toBe(true));
      await wrapper.get("[aria-label='Condition 1 tag']").trigger("click");
      await vi.waitFor(() => expect(document.body.querySelector("[role=option]")).not.toBeNull());
      [...document.body.querySelectorAll<HTMLElement>("[role=option]")].find(el => el.textContent?.trim() === "Sale")!.click();
      await nextTick();

      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(requests.posts).toHaveLength(1));
      expect(requests.posts[0]).toMatchObject({
        type: CollectionType.Automated,
        rules: { match: RuleMatch.All, rules: [{ type: RuleType.Tag, operator: TagOperator.Has, tagId: SALE_ID }] },
      });
      expect(JSON.stringify(requests.posts[0])).not.toContain('"key"');
      expect(requests.posts[0]).not.toHaveProperty("productIds");
    });

    it("shows a field error from the server on its field and opens the search listing for it", async () => {
      requests.failWith = { handle: ["This URL is reserved for the all products page"] };
      const wrapper = await mountForm();
      await field(wrapper, "Title").setValue("All");
      await field(wrapper, "URL handle").setValue("all");

      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(wrapper.text()).toContain("This URL is reserved for the all products page"));
    });
  });

  describe("editing", () => {
    it("fills the fields and shows the type as read-only", async () => {
      const wrapper = await mountForm({ collection: manual, products: [lamp] });

      expect(field(wrapper, "Title").element.value).toBe("Gifts");
      expect(field(wrapper, "Description").element.value).toBe("Ideas for everyone");
      expect(field(wrapper, "URL handle").element.value).toBe("gifts");
      expect(wrapper.text()).toContain("Hand-picked. The type can't be changed");
      expect(wrapper.find("[role=radio][value=automated]").exists()).toBe(false);
      expect(wrapper.get("ul[aria-label='Products in this collection']").text()).toContain("Moon Lamp");
    });

    it("keeps the saved handle when the title changes", async () => {
      const wrapper = await mountForm({ collection: manual });

      await field(wrapper, "Title").setValue("Gift ideas");

      expect(field(wrapper, "URL handle").element.value).toBe("gifts");
    });

    it("shows the rules of an automatic collection", async () => {
      const wrapper = await mountForm({ collection: automatic });

      await vi.waitFor(() => expect(wrapper.get("[aria-label='Condition 1 tag']").text()).toContain("Sale"));
      expect(wrapper.text()).toContain("Automatic. The type can't be changed");
    });

    it("shows the save bar only once something changes", async () => {
      const wrapper = await mountForm({ collection: manual });
      expect(wrapper.find("[role=region]").exists()).toBe(false);

      await field(wrapper, "Title").setValue("Gift ideas");

      expect(wrapper.get("[role=region]").attributes("aria-label")).toBe("Unsaved changes");
    });

    it("saves with a PATCH", async () => {
      const wrapper = await mountForm({ collection: manual, products: [lamp] });
      await field(wrapper, "Title").setValue("Gift ideas");

      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(requests.patches).toHaveLength(1));
      expect(requests.patches[0]).toMatchObject({ title: "Gift ideas", productIds: [LAMP_ID] });
      await vi.waitFor(() => expect(wrapper.emitted("saved")).toHaveLength(1));
    });

    it("lets the status and sort be changed", async () => {
      const wrapper = await mountForm({ collection: automatic });

      await radio(wrapper, "Live").trigger("click");
      await choose(wrapper, "Default sort", "Price: low to high");
      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(requests.patches).toHaveLength(1));
      expect(requests.patches[0]).toMatchObject({ status: CollectionStatus.Published, defaultSort: ProductSort.PriceAsc });
    });
  });

  describe("the locked all products collection", () => {
    it("explains that it is locked and has no conditions, preview or products card", async () => {
      const wrapper = await mountForm({ collection: locked });

      expect(wrapper.text()).toContain("This collection is locked");
      expect(wrapper.text()).toContain("Every product is in this collection.");
      expect(headings(wrapper)).not.toContain("Preview");
      expect(wrapper.find("ul[aria-label=Conditions]").exists()).toBe(false);
    });

    it("makes the handle, status and sort read-only but leaves the title editable", async () => {
      const wrapper = await mountForm({ collection: locked });

      expect(field(wrapper, "URL handle").element.disabled).toBe(true);
      expect(field(wrapper, "Title").element.disabled).toBe(false);
      expect(wrapper.get("[aria-label='Default sort']").attributes("disabled")).toBeDefined();
      expect(wrapper.findAll("[role=radio]")).toHaveLength(0);
      expect(wrapper.text()).toContain("Live. The status of this collection can't be changed.");
    });

    it("sends only the editable fields", async () => {
      const wrapper = await mountForm({ collection: locked });
      await field(wrapper, "Title").setValue("Everything");

      await wrapper.get("form").trigger("submit");

      await vi.waitFor(() => expect(requests.patches).toHaveLength(1));
      expect(Object.keys(requests.patches[0]!).sort()).toEqual(["description", "imageAlt", "imageUrl", "seoDescription", "seoTitle", "title"]);
      expect(requests.patches[0]).toMatchObject({ title: "Everything" });
    });
  });
});
