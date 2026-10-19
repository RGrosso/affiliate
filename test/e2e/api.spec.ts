import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./config";

const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
const image = { name: "cover.png", mimeType: "image/png", buffer: PIXEL };

test.describe("API", () => {
  test("rejects product changes from logged-out requests with an ApiError", async ({ request }) => {
    const response = await request.post("/api/products", { data: { title: "Sneaky" } });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  test("rejects the tag list for logged-out requests with an ApiError", async ({ request }) => {
    const response = await request.get("/api/tags");

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  test("rejects a single tag for logged-out requests with an ApiError", async ({ request }) => {
    const response = await request.get("/api/tags/00000000-0000-4000-8000-000000000000");

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  test("returns no products for an unknown tag", async ({ request }) => {
    const response = await request.get("/api/products?tag=no-such-tag");

    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ items: [], total: 0 });
  });

  test("returns no products for several unknown tags", async ({ request }) => {
    const response = await request.get("/api/products?tag=no-such-tag&tag=also-missing");

    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ items: [], total: 0 });
  });

  test("pages the product list", async ({ request }) => {
    const list = async (query: string) => {
      const response = await request.get(`/api/products?${query}`);
      expect(response.status()).toBe(200);
      return (await response.json()).data;
    };

    // The sample products are seeded by the setup login, so there's always more than one
    const all = await list("pageSize=100");
    expect(all.total).toBeGreaterThan(1);
    expect(all.items).toHaveLength(all.total);

    const first = await list("page=1&pageSize=1");
    expect(first).toMatchObject({ page: 1, pageSize: 1, total: all.total, totalPages: all.total });
    expect(first.items).toEqual([all.items[0]]);

    const last = await list(`page=${all.total}&pageSize=1`);
    expect(last.items).toEqual([all.items.at(-1)]);

    const past = await list(`page=${all.total + 1}&pageSize=1`);
    expect(past.items).toEqual([]);
    expect(past.total).toBe(all.total);
  });

  test("returns a product by its handle to logged-out requests", async ({ request }) => {
    const response = await request.get("/api/products/handle/cast-iron-skillet-12");

    expect(response.status()).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({ handle: "cast-iron-skillet-12", brand: "Ironhearth" });
    expect(data).not.toHaveProperty("authorId");
  });

  test("returns a 404 for an unknown or malformed product handle", async ({ request }) => {
    for (const handle of ["no-such-product", "Not%20A%20Handle"]) {
      const response = await request.get(`/api/products/handle/${handle}`);

      expect(response.status()).toBe(404);
      expect(await response.json()).toMatchObject({ success: false, code: "NOT_FOUND" });
    }
  });

  test("only lets admins ask for every tag on the product list", async ({ request }) => {
    const response = await request.get("/api/products?allTags=true");

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  test("rejects a page size over the maximum", async ({ request }) => {
    const response = await request.get("/api/products?pageSize=500");

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { pageSize: ["The page size can be at most 100"] },
    });
  });

  test("rejects image uploads from logged-out requests", async ({ request }) => {
    const response = await request.post("/api/products/images", { multipart: { file: image, prefix: "collections" } });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  test("rejects every admin collection route for logged-out requests", async ({ request }) => {
    const id = "00000000-0000-4000-8000-000000000000";
    const calls = [
      request.get("/api/collections"),
      request.post("/api/collections", { data: { type: "manual", title: "Sneaky" } }),
      request.get(`/api/collections/${id}`),
      request.patch(`/api/collections/${id}`, { data: { title: "Sneaky" } }),
      request.delete(`/api/collections/${id}`),
      request.post("/api/collections/preview", { data: {} }),
      request.get("/api/products/retailers"),
    ];

    for (const response of await Promise.all(calls)) {
      expect(response.status(), response.url()).toBe(401);
      expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
    }
  });

  test("returns the all products collection publicly, without its rules", async ({ request }) => {
    const response = await request.get("/api/collections/handle/all");

    expect(response.status()).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({ handle: "all", title: "All products", isDraft: false });
    expect(data).not.toHaveProperty("rules");
  });

  test("lists the products of the all collection, with tag facets only on the first page", async ({ request }) => {
    const first = await request.get("/api/collections/handle/all/products?pageSize=10");
    expect(first.status()).toBe(200);
    const firstPage = (await first.json()).data;
    expect(firstPage.total).toBeGreaterThan(10);
    expect(firstPage.items).toHaveLength(10);
    expect(firstPage.facets).toEqual({ tags: expect.any(Array) });

    const second = await request.get("/api/collections/handle/all/products?pageSize=10&page=2");
    expect((await second.json()).data).not.toHaveProperty("facets");
  });

  test("sorts a collection's products", async ({ request }) => {
    const response = await request.get("/api/collections/handle/all/products?sort=price-asc&pageSize=100");

    expect(response.status()).toBe(200);
    const prices = (await response.json()).data.items.map((item: { pricePence: number | null }) => item.pricePence);
    const priced = prices.filter((price: number | null) => price !== null);
    expect(priced).toEqual([...priced].sort((a: number, b: number) => a - b));
    expect(prices.slice(0, priced.length)).toEqual(priced);
  });

  test("rejects an unknown sort and manual order on an automated collection", async ({ request }) => {
    const unknown = await request.get("/api/collections/handle/all/products?sort=random");
    expect(unknown.status()).toBe(400);
    expect(await unknown.json()).toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { sort: ["Please choose how to sort the products"] } });

    const manual = await request.get("/api/collections/handle/all/products?sort=manual");
    expect(manual.status()).toBe(400);
    expect(await manual.json()).toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { sort: expect.any(Array) } });
  });

  test("returns a 404 for an unknown or malformed collection handle", async ({ request }) => {
    for (const path of ["no-such-collection", "Not%20A%20Handle", "no-such-collection/products"]) {
      const response = await request.get(`/api/collections/handle/${path}`);

      expect(response.status(), path).toBe(404);
      expect(await response.json()).toMatchObject({ success: false, code: "NOT_FOUND" });
    }
  });

  test.describe("as the admin", () => {
    test.use({ storageState: ADMIN_STATE });

    test("returns friendly field errors for invalid collections", async ({ request }) => {
      const response = await request.post("/api/collections", { data: { type: "automated", title: "", handle: "all" } });

      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        fieldErrors: {
          title: ["Please give the collection a title"],
          handle: ["This URL is reserved for the all products page"],
          rules: expect.any(Array),
        },
      });
    });

    test("keeps a draft collection from visitors but shows it to the admin", async ({ request, playwright, baseURL }) => {
      const handle = `draft-e2e-${Date.now()}`;
      const created = await request.post("/api/collections", { data: { type: "manual", title: "Draft e2e", handle } });
      expect(created.status()).toBe(200);
      const { id } = (await created.json()).data;

      try {
        const visitor = await playwright.request.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } });
        for (const path of [`/api/collections/handle/${handle}`, `/api/collections/handle/${handle}/products`]) {
          const hidden = await visitor.get(path);
          expect(hidden.status(), path).toBe(404);
          expect(await hidden.json()).toMatchObject({ success: false, code: "NOT_FOUND" });
        }
        await visitor.dispose();

        const shown = await request.get(`/api/collections/handle/${handle}`);
        expect(shown.status()).toBe(200);
        expect((await shown.json()).data).toMatchObject({ handle, isDraft: true });
        expect((await request.get(`/api/collections/handle/${handle}/products`)).status()).toBe(200);
      } finally {
        await request.delete(`/api/collections/${id}`);
      }
    });

    test("won't delete the all products collection", async ({ request }) => {
      const list = await request.get("/api/collections");
      const all = (await list.json()).data.find((collection: { locked: boolean }) => collection.locked);
      expect(all).toMatchObject({ handle: "all", rulesSummary: "Every product" });

      const response = await request.delete(`/api/collections/${all.id}`);
      expect(response.status()).toBe(409);
      expect(await response.json()).toMatchObject({ success: false, code: "CONFLICT" });
    });

    test("won't delete a tag that a collection uses", async ({ request }) => {
      const tag = (await (await request.post("/api/tags", { data: { name: `E2e tag ${Date.now()}` } })).json()).data;
      const rules = { match: "all", rules: [{ type: "tag", operator: "has", tagId: tag.id }] };
      const created = await request.post("/api/collections", {
        data: { type: "automated", title: "Uses e2e tag", handle: `uses-e2e-tag-${Date.now()}`, rules },
      });
      const collection = (await created.json()).data;

      try {
        const blocked = await request.delete(`/api/tags/${tag.id}`);
        expect(blocked.status()).toBe(409);
        expect((await blocked.json()).message).toBe("This tag is used by Uses e2e tag. Remove it from that collection first.");

        const listed = (await (await request.get("/api/tags")).json()).data.find((t: { id: string }) => t.id === tag.id);
        expect(listed.collections).toEqual([{ id: collection.id, title: "Uses e2e tag" }]);
      } finally {
        await request.delete(`/api/collections/${collection.id}`);
        expect((await request.delete(`/api/tags/${tag.id}`)).status()).toBe(200);
      }
    });

    test("stores uploaded images under the product or collection prefix", async ({ request }) => {
      const upload = async (fields: Record<string, string>) => request.post("/api/products/images", { multipart: { file: image, ...fields } });

      expect((await (await upload({})).json()).data.url).toMatch(/^\/images\/products\//);
      expect((await (await upload({ prefix: "products" })).json()).data.url).toMatch(/^\/images\/products\//);
      expect((await (await upload({ prefix: "collections" })).json()).data.url).toMatch(/^\/images\/collections\//);
    });

    test("rejects an unknown image prefix", async ({ request }) => {
      const response = await request.post("/api/products/images", { multipart: { file: image, prefix: "../secrets" } });

      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ success: false, code: "BAD_REQUEST", message: "Please choose where the image belongs" });
    });

    test("searches the product list by title, ignoring case", async ({ request }) => {
      const found = await request.get("/api/products?q=pour-OVER%20coffee");
      expect((await found.json()).data.items.map((item: { title: string }) => item.title)).toEqual(["Pour-Over Coffee Kit"]);

      const none = await request.get("/api/products?q=no-such-product-title");
      expect((await none.json()).data).toMatchObject({ items: [], total: 0 });
    });

    test("rejects a product search that is too long", async ({ request }) => {
      const response = await request.get(`/api/products?q=${"x".repeat(101)}`);

      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR", fieldErrors: { q: ["The search can be at most 100 characters"] } });
    });

    test("lists the retailers for the rule dropdown", async ({ request }) => {
      const response = await request.get("/api/products/retailers");

      expect(response.status()).toBe(200);
      const { data } = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toEqual([...data].sort());
    });

    test("returns friendly field errors for invalid products", async ({ request }) => {
      const response = await request.post("/api/products", { data: { title: "", price: -5 } });

      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        fieldErrors: {
          title: ["Please give the product a title"],
          price: ["The price can't be negative"],
        },
      });
    });
  });
});
