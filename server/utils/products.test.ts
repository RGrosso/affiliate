import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { describe, expect, it } from "vitest";
import { rethrowAsDuplicateHandle, toImageValues, toProductValues } from "./products";

const thrown = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error as H3Error<ApiError>;
  }
  throw new Error("Expected the function to throw");
};

describe("toProductValues", () => {
  it("converts the price from pounds to whole pence", () => {
    expect(toProductValues({ title: "Moon Lamp", price: 19.99, tagIds: [], images: [] }).pricePence).toBe(1999);
    expect(toProductValues({ title: "Moon Lamp", price: 0.29, tagIds: [], images: [] }).pricePence).toBe(29);
  });

  it("keeps a missing price as null", () => {
    expect(toProductValues({ title: "Moon Lamp", tagIds: [], images: [] }).pricePence).toBeNull();
    expect(toProductValues({ title: "Moon Lamp", price: null, tagIds: [], images: [] }).pricePence).toBeNull();
  });

  it("builds the handle from the title when none is given", () => {
    expect(toProductValues({ title: "Moon Lamp", tagIds: [], images: [] }).handle).toBe("moon-lamp");
    expect(toProductValues({ title: "Moon Lamp", handle: "lamp", tagIds: [], images: [] }).handle).toBe("lamp");
  });

  it("leaves images, tags and price out of the row", () => {
    const values = toProductValues({ title: "Moon Lamp", price: 1, tagIds: [], images: [{ url: "/a.jpg" }] });
    expect(values).not.toHaveProperty("images");
    expect(values).not.toHaveProperty("tagIds");
    expect(values).not.toHaveProperty("price");
  });

  it("asks for a handle when the title has no letters or numbers", () => {
    const error = thrown(() => toProductValues({ title: "!!!", tagIds: [], images: [] }));
    expect(error.statusCode).toBe(400);
    expect(error.data?.fieldErrors).toEqual({ handle: ["Please add a URL handle using letters or numbers"] });
  });
});

describe("toImageValues", () => {
  it("numbers images in the order given", () => {
    expect(toImageValues("p1", [{ url: "/a.jpg", alt: "A" }, { url: "/b.jpg" }])).toEqual([
      { productId: "p1", url: "/a.jpg", alt: "A", position: 0 },
      { productId: "p1", url: "/b.jpg", alt: undefined, position: 1 },
    ]);
  });
});

describe("rethrowAsDuplicateHandle", () => {
  it("turns a unique violation into a conflict on the handle field", () => {
    const error = thrown(() => rethrowAsDuplicateHandle({ cause: { code: "23505" } }));
    expect(error.statusCode).toBe(409);
    expect(error.data).toMatchObject({
      code: "CONFLICT",
      fieldErrors: { handle: ["Another product already uses this URL handle"] },
    });
  });

  it("rethrows any other error unchanged", () => {
    const original = new Error("connection lost");
    expect(thrown(() => rethrowAsDuplicateHandle(original))).toBe(original);
  });
});
