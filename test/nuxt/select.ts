import { expect, vi } from "vitest";
import type { VueWrapper } from "@vue/test-utils";

// Menus are teleported to <body> and earlier tests' menus can linger, so only look at the newest one
const menu = () => [...document.body.querySelectorAll<HTMLElement>("[role=listbox]")].at(-1);

/** The element with the given accessible name, like a screen reader user would find it. */
export function byLabel(wrapper: VueWrapper, label: string): HTMLElement {
  const found = (wrapper.element as HTMLElement).querySelector<HTMLElement>(`[aria-label="${label}"]`);
  if (!found) throw new Error(`Nothing labelled "${label}"`);
  return found;
}

export const optionTexts = () => [...(menu()?.querySelectorAll<HTMLElement>("[role=option]") ?? [])].map(el => el.textContent?.trim());

async function open(opener: () => void) {
  const before = new Set(document.body.querySelectorAll("[role=listbox]"));
  opener();
  // Closed menus can linger while they animate away, so wait for a new one
  await vi.waitFor(() => expect([...document.body.querySelectorAll("[role=listbox]")].some(listbox => !before.has(listbox))).toBe(true));
}

/** Opens the `USelect` labelled `label`. Reka's select trigger opens on a mouse pointerdown, not a click. */
export function openSelect(wrapper: VueWrapper, label: string) {
  const trigger = byLabel(wrapper, label);
  return open(() => trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" })));
}

/** Opens the searchable `USelectMenu` labelled `label`. */
export function openMenu(wrapper: VueWrapper, label: string) {
  const trigger = byLabel(wrapper, label);
  return open(() => trigger.click());
}

/**
 * Chooses the option with that text in the newest menu. A `USelect` only reacts to the keyboard here (it wants real
 * pointer events a test can't send), while the options of a searchable `USelectMenu` are clicked.
 */
export async function pick(option: string, via: "key" | "click" = "click") {
  const item = [...(menu()?.querySelectorAll<HTMLElement>("[role=option]") ?? [])].find(el => el.textContent?.trim() === option);
  if (!item) throw new Error(`No option "${option}" in ${JSON.stringify(optionTexts())}`);

  if (via === "click") {
    item.click();
  } else {
    item.focus();
    item.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  }
  await nextTick();
}

/** Opens the `USelect` labelled `label` and chooses the option with that text. */
export async function choose(wrapper: VueWrapper, label: string, option: string) {
  await openSelect(wrapper, label);
  await pick(option, "key");
}

/** Types into the search box of the open menu. */
export async function searchMenu(text: string) {
  const input = [...document.body.querySelectorAll<HTMLInputElement>("input[role=combobox]")].at(-1);
  if (!input) throw new Error("The open menu has no search box");
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}
