import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { setResponseStatus } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionRulesPreview, UApp } from "#components";
import { ProductSort } from "#shared/types/collection";
import { RuleMatch, RuleType, TagOperator, type CollectionRules } from "#shared/types/collectionRules";
import { expectAccessible } from "~~/test/nuxt/axe";
import { readJsonBody } from "~~/test/nuxt/body";

const SALE_ID = "0b6e2f1c-8a4d-4f7e-9c1a-3d5b7e9f1a2b";
const ECO_ID = "5c1d9e3a-2b7f-4a68-8d0e-6f4a2c8b1e90";

const tag = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase(),
  description: null,
  tooltip: null,
  icon: null,
  priority: null,
  showOnCards: true,
  showInFilter: false,
  productCount: 0,
  collections: [],
});

const product = (id: string, title: string) => ({
  id,
  title,
  handle: id,
  description: null,
  pricePence: 1999,
  retailer: null,
  affiliateUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  image: null,
  tags: [],
});

const saleRules: CollectionRules = { match: RuleMatch.All, rules: [{ type: RuleType.Tag, operator: TagOperator.Has, tagId: SALE_ID }] };
const ecoRules: CollectionRules = { match: RuleMatch.All, rules: [{ type: RuleType.Tag, operator: TagOperator.Has, tagId: ECO_ID }] };

const requests = vi.hoisted(() => [] as { rules: CollectionRules; sort: string }[]);
const response = vi.hoisted(() => ({ fail: false, total: 23 }));

registerEndpoint("/api/tags", () => ({ success: true, data: [tag(SALE_ID, "Sale"), tag(ECO_ID, "Eco")] }));
registerEndpoint("/api/collections/preview", {
  method: "POST",
  handler: event => {
    requests.push(readJsonBody(event) as { rules: CollectionRules; sort: string });
    if (response.fail) {
      setResponseStatus(event, 500);
      return { success: false, code: "INTERNAL_ERROR", message: "Something went wrong on our side" };
    }
    return { success: true, data: { total: response.total, items: [product("lamp", "Moon Lamp"), product("mug", "Blue Mug")] } };
  },
});

// Unmounted after each test so a pending debounced request from one can't reach the next
const apps: { unmount: () => void }[] = [];

async function mountPreview(initial: CollectionRules | null = saleRules) {
  const props = reactive({ rules: initial, sort: ProductSort.Newest as ProductSort });
  const app = await mountSuspended({
    render: () => h(UApp, null, { default: () => h(CollectionRulesPreview, { rules: props.rules, sort: props.sort }) }),
  });
  apps.push(app);
  return { wrapper: app.findComponent(CollectionRulesPreview), props };
}

describe("CollectionRulesPreview", () => {
  beforeEach(() => {
    requests.length = 0;
    response.fail = false;
    response.total = 23;
  });

  afterEach(() => {
    apps.splice(0).forEach(app => app.unmount());
  });

  it("shows how many products match, what the rules say and the first products", async () => {
    const { wrapper } = await mountPreview();

    await vi.waitFor(() => expect(wrapper.text()).toContain("23 products match"));
    expect(wrapper.text()).toContain("Has the tag “Sale”");
    expect(wrapper.findAll("li").map(li => li.text())).toEqual(
      expect.arrayContaining([expect.stringContaining("Moon Lamp"), expect.stringContaining("Blue Mug")])
    );
    expect(wrapper.text()).toContain("and 21 more");
    expect(requests).toEqual([{ rules: saleRules, sort: ProductSort.Newest }]);
  });

  it("is accessible", async () => {
    const { wrapper } = await mountPreview();
    await vi.waitFor(() => expect(wrapper.text()).toContain("23 products match"));

    await expectAccessible(wrapper);
  });

  it("says when exactly one product matches", async () => {
    response.total = 1;
    const { wrapper } = await mountPreview();

    await vi.waitFor(() => expect(wrapper.text()).toContain("1 product matches"));
  });

  it("asks again, once, after the rules change and settle", async () => {
    const { wrapper, props } = await mountPreview();
    await vi.waitFor(() => expect(wrapper.text()).toContain("23 products match"));

    response.total = 5;
    props.rules = ecoRules;
    props.sort = ProductSort.PriceAsc;

    await vi.waitFor(() => expect(wrapper.text()).toContain("5 products match"));
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual({ rules: ecoRules, sort: ProductSort.PriceAsc });
    expect(wrapper.text()).toContain("Has the tag “Eco”");
  });

  it("keeps the last result on screen while the next one loads", async () => {
    const { wrapper, props } = await mountPreview();
    await vi.waitFor(() => expect(wrapper.text()).toContain("23 products match"));

    props.sort = ProductSort.Oldest;
    await nextTick();

    expect(wrapper.text()).toContain("23 products match");
  });

  it("asks for the conditions to be finished, without asking the server, while the rules are invalid", async () => {
    const { wrapper } = await mountPreview(null);

    expect(wrapper.text()).toContain("Finish the conditions to see which products match.");
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(requests).toHaveLength(0);
  });

  it("shows a friendly message when the preview fails", async () => {
    response.fail = true;
    const { wrapper } = await mountPreview();

    await vi.waitFor(() => expect(wrapper.text()).toContain("Couldn't load the preview"));
    expect(wrapper.text()).toContain("Something went wrong on our side");
    await expectAccessible(wrapper);
  });
});
