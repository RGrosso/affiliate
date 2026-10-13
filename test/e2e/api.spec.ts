import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./config";

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

  test("returns no products for an unknown tag", async ({ request }) => {
    const response = await request.get("/api/products?tag=no-such-tag");

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

  test("rejects a page size over the maximum", async ({ request }) => {
    const response = await request.get("/api/products?pageSize=500");

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { pageSize: ["The page size can be at most 100"] },
    });
  });

  test.describe("as the admin", () => {
    test.use({ storageState: ADMIN_STATE });

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
