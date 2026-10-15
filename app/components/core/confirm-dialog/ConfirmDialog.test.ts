import { afterEach, describe, expect, it } from "vitest";
import { CoreConfirmDialog, UApp } from "#components";
import { mountSuspended } from "@nuxt/test-utils/runtime";

const props = {
  title: "Delete tag?",
  description: "This can't be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Keep it",
  color: "error",
};

// UModal teleports its content to <body>
const button = (label: string) => [...document.body.querySelectorAll("button")].find(el => el.textContent?.trim() === label);

const mounted: { unmount: () => void }[] = [];

async function mount(props: { title: string } & Record<string, unknown>) {
  const app = await mountSuspended({
    render: () => h(UApp, null, { default: () => h(CoreConfirmDialog, props) }),
  });
  mounted.push(app);
  return app.findComponent(CoreConfirmDialog);
}

describe("CoreConfirmDialog", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount());
  });

  it("shows the title, description and both buttons", async () => {
    await mount(props);

    const dialog = document.body.querySelector("[role=dialog]")!;
    expect(dialog.textContent).toContain("Delete tag?");
    expect(dialog.textContent).toContain("This can't be undone.");
    expect(button("Delete")).toBeDefined();
    expect(button("Keep it")).toBeDefined();
  });

  it("shows the closing question above the buttons", async () => {
    await mount({ ...props, question: "Are you sure?" });

    expect(document.body.querySelector("[role=dialog]")!.textContent).toContain("Are you sure?");
  });

  it("renders the title as a compact heading", async () => {
    await mount(props);

    const title = document.body.querySelector("[role=dialog] [id]")?.closest("[role=dialog]")?.querySelector("h2");
    expect(title?.textContent).toBe("Delete tag?");
    expect(title?.classList).toContain("text-base");
  });

  it("emits close with true when confirmed", async () => {
    const wrapper = await mount(props);

    button("Delete")!.click();

    expect(wrapper.emitted("close")).toEqual([[true]]);
  });

  it("emits close with false when cancelled", async () => {
    const wrapper = await mount(props);

    button("Keep it")!.click();

    expect(wrapper.emitted("close")).toEqual([[false]]);
  });

  it("falls back to Confirm and Cancel labels", async () => {
    await mount({ title: "Sure?" });

    expect(button("Confirm")).toBeDefined();
    expect(button("Cancel")).toBeDefined();
  });
});
