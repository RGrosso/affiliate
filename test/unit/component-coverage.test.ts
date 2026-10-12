// Every component lives in its own folder with a test beside it (see app/APP.md).
// This fails when a component is added without one, or not in its own folder.
import { readdirSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentsDir = fileURLToPath(new URL("../../app/components", import.meta.url));

const files = readdirSync(componentsDir, { recursive: true, encoding: "utf8" })
  .map(file => file.replaceAll("\\", "/"));

const components = files.filter(file => file.endsWith(".vue"));

describe("components", () => {
  it.each(components)("%s has a test beside it", (component) => {
    const test = component.replace(/\.vue$/, ".test.ts");
    expect(files, `Add ${test}`).toContain(test);
  });

  it.each(components)("%s is the only component in its folder", (component) => {
    const siblings = components.filter(other => dirname(other) === dirname(component));
    expect(siblings.map(file => basename(file)), `Move ${component} into its own folder`).toEqual([
      basename(component),
    ]);
  });

  it("finds the components", () => {
    expect(components.length).toBeGreaterThan(0);
  });
});
