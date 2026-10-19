import type { H3Error } from "h3";
import type { ApiError } from "#shared/types/api";
import { describe, expect, it } from "vitest";
import { META_DESCRIPTION_LENGTH } from "#shared/utils/metaDescription";
import { rethrowAsDuplicateCollectionHandle, resolveCollectionHandle, resolveCollectionSeo } from "./collections";

const thrown = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error as H3Error<ApiError>;
  }
  throw new Error("Expected the function to throw");
};

describe("resolveCollectionHandle", () => {
  it("uses the handle when given, otherwise builds one from the title", () => {
    expect(resolveCollectionHandle("gifts", "Anything")).toBe("gifts");
    expect(resolveCollectionHandle(undefined, "Gifts For Her")).toBe("gifts-for-her");
  });

  it("asks for a handle when the title has no letters or numbers", () => {
    expect(thrown(() => resolveCollectionHandle(undefined, "!!!")).data?.fieldErrors).toEqual({ handle: ["Please add a URL handle using letters or numbers"] });
  });

  it("reserves the handle of the all products page, whether given or built from the title", () => {
    const reserved = { handle: ["This URL is reserved for the all products page"] };

    expect(thrown(() => resolveCollectionHandle("all", "Anything")).data?.fieldErrors).toEqual(reserved);
    expect(thrown(() => resolveCollectionHandle(undefined, "All")).data?.fieldErrors).toEqual(reserved);
  });
});

describe("resolveCollectionSeo", () => {
  const collection = { title: "Gifts", description: "A lovely gift", seoTitle: null, seoDescription: null };

  it("uses the SEO fields when they are set", () => {
    expect(resolveCollectionSeo({ ...collection, seoTitle: "Buy gifts", seoDescription: "Great gifts" })).toEqual({
      seoTitle: "Buy gifts",
      seoDescription: "Great gifts",
    });
  });

  it("falls back to the title and description", () => {
    expect(resolveCollectionSeo(collection)).toEqual({ seoTitle: "Gifts", seoDescription: "A lovely gift" });
  });

  it("cuts a long description down and trims it", () => {
    const description = `${"a".repeat(META_DESCRIPTION_LENGTH - 1)} ${"b".repeat(50)}`;

    expect(resolveCollectionSeo({ ...collection, description }).seoDescription).toBe("a".repeat(META_DESCRIPTION_LENGTH - 1));
  });

  it("has no description when there is nothing to fall back to", () => {
    expect(resolveCollectionSeo({ ...collection, description: null }).seoDescription).toBeNull();
    expect(resolveCollectionSeo({ ...collection, description: "   " }).seoDescription).toBeNull();
  });
});

describe("rethrowAsDuplicateCollectionHandle", () => {
  it("turns a unique violation into a handle field error", () => {
    const error = thrown(() => rethrowAsDuplicateCollectionHandle({ code: "23505" }));

    expect(error.statusCode).toBe(409);
    expect(error.data?.fieldErrors).toEqual({ handle: ["Another collection already uses this URL handle"] });
  });

  it("rethrows anything else", () => {
    const other = new Error("boom");

    expect(thrown(() => rethrowAsDuplicateCollectionHandle(other))).toBe(other);
  });
});
