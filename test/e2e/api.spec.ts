import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./config";

test.describe("API", () => {
  test("rejects product changes from logged-out requests with an ApiError", async ({ request }) => {
    const response = await request.post("/api/products", { data: { title: "Sneaky" } });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
  });

  test("pages the product list", async ({ request }) => {
    const response = await request.get("/api/products?page=1&pageSize=2");

    expect(response.status()).toBe(200);
    const { success, data } = await response.json();
    expect(success).toBe(true);
    expect(data).toMatchObject({ page: 1, pageSize: 2 });
    expect(data.items.length).toBeLessThanOrEqual(2);
    expect(data.total).toBeGreaterThanOrEqual(data.items.length);
    expect(data.totalPages).toBe(Math.ceil(data.total / 2));
    expect(typeof data.sampleCount).toBe("number");
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
