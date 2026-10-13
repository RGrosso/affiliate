import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./config";

test.describe("API", () => {
  test("rejects product changes from logged-out requests with an ApiError", async ({ request }) => {
    const response = await request.post("/api/products", { data: { title: "Sneaky" } });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, code: "UNAUTHORIZED" });
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
