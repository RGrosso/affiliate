import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { UApp } from "#components";
import { useConfirmDialog } from "./confirmDialog";

const button = (label: string) => [...document.body.querySelectorAll("button")].find(el => el.textContent?.trim() === label);

const mounted: { unmount: () => void }[] = [];

async function openDialog() {
  const Host = defineComponent({
    setup() {
      const { confirm } = useConfirmDialog();
      return { confirm };
    },
    render: () => h("div"),
  });
  const app = await mountSuspended({ render: () => h(UApp, null, { default: () => h(Host) }) });
  mounted.push(app);
  const wrapper = app.findComponent(Host);
  const result = (wrapper.vm as unknown as { confirm: ReturnType<typeof useConfirmDialog>["confirm"] }).confirm({
    title: "Delete tag?",
    description: "This can't be undone.",
    confirmLabel: "Delete",
    cancelLabel: "Keep it",
    color: "error",
  });
  await vi.waitFor(() => expect(button("Delete")).toBeDefined());
  return { result };
}

describe("useConfirmDialog", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount());
  });

  it("resolves true when confirmed", async () => {
    const { result } = await openDialog();
    button("Delete")!.click();
    await expect(result).resolves.toBe(true);
  });

  it("resolves false when cancelled", async () => {
    const { result } = await openDialog();
    button("Keep it")!.click();
    await expect(result).resolves.toBe(false);
  });

  it("resolves false when dismissed with Escape", async () => {
    const { result } = await openDialog();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(result).resolves.toBe(false);
  });
});
