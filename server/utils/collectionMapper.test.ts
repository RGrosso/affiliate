import { describe, expect, it } from "vitest";
import { CollectionStatus, CollectionType, ProductSort } from "#shared/types/collection";
import { sortFromStored, sortToStored, statusFromStored, statusToStored, typeFromStored, typeToStored } from "./collectionMapper";

describe("collection mappers", () => {
  it("map every API value to a stored value and back", () => {
    for (const value of Object.values(CollectionType)) expect(typeFromStored[typeToStored[value]]).toBe(value);
    for (const value of Object.values(CollectionStatus)) expect(statusFromStored[statusToStored[value]]).toBe(value);
    for (const value of Object.values(ProductSort)) expect(sortFromStored[sortToStored[value]]).toBe(value);
  });

  it("cover every value on both sides", () => {
    expect(Object.keys(typeToStored)).toHaveLength(Object.keys(CollectionType).length);
    expect(Object.keys(typeFromStored)).toHaveLength(Object.keys(CollectionType).length);
    expect(Object.keys(statusToStored)).toHaveLength(Object.keys(CollectionStatus).length);
    expect(Object.keys(statusFromStored)).toHaveLength(Object.keys(CollectionStatus).length);
    expect(Object.keys(sortToStored)).toHaveLength(Object.keys(ProductSort).length);
    expect(Object.keys(sortFromStored)).toHaveLength(Object.keys(ProductSort).length);
  });

  it("store the sorts with underscores, unlike the API", () => {
    expect(sortToStored[ProductSort.PriceAsc]).toBe("price_asc");
    expect(sortFromStored.title_desc).toBe(ProductSort.TitleDesc);
  });
});
