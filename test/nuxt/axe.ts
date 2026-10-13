import "axe-core";
import type { AxeResults, RunOptions } from "axe-core";
import type { VueWrapper } from "@vue/test-utils";
import { expect } from "vitest";

// axe-core is a UMD module that exposes itself as window.axe in the browser
declare const axe: {
  run: (context: Element, options?: RunOptions) => Promise<AxeResults>;
};

const options: RunOptions = {
  resultTypes: ["violations"],
  rules: {
    // Page-level rules that don't apply to a component rendered on its own
    "landmark-one-main": { enabled: false },
    "region": { enabled: false },
    "page-has-heading-one": { enabled: false },
  },
};

async function violationsIn(container: HTMLElement) {
  const { violations } = await axe.run(container, options);
  return violations.flatMap(v =>
    v.nodes.map(node => `${v.id}: ${node.failureSummary ?? v.help}\n  at ${node.html}`)
  );
}

/** Fails the test with a readable list if axe finds accessibility violations, in light or dark mode. */
export async function expectAccessible(wrapper: VueWrapper) {
  const container = document.createElement("div");
  container.append(wrapper.element.cloneNode(true));
  document.body.append(container);
  const root = document.documentElement;
  const original = root.className;
  // Colour transitions would make axe read the old mode's colours straight after switching
  const noTransitions = document.createElement("style");
  noTransitions.textContent = "*, *::before, *::after { transition: none !important; }";
  document.head.append(noTransitions);

  // Colour mode sets either `light` or `dark` on <html>, so swap one for the other
  try {
    root.classList.remove("dark");
    root.classList.add("light");
    expect(await violationsIn(container), "light mode").toEqual([]);

    root.classList.remove("light");
    root.classList.add("dark");
    expect(await violationsIn(container), "dark mode").toEqual([]);
  } finally {
    root.className = original;
    noTransitions.remove();
    container.remove();
  }
}
