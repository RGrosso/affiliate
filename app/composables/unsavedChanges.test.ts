import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { UApp } from "#components";
import { useUnsavedChangesGuard } from "./unsavedChanges";

const dirty = ref(false);
let guard: ReturnType<typeof useUnsavedChangesGuard>;

const Page = defineComponent({
  setup() {
    guard = useUnsavedChangesGuard(dirty);
    return () => h(UApp, null, { default: () => h("p", "Editing") });
  },
});

const button = (label: string) => [...document.body.querySelectorAll("button")].find(el => el.textContent?.trim() === label);

const mounted: { unmount: () => void }[] = [];

async function mountPage() {
  const router = useRouter();
  await router.push("/");
  const wrapper = await mountSuspended(Page, { route: "/" });
  mounted.push(wrapper);
  return router;
}

function beforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("useUnsavedChangesGuard", () => {
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount());
    dirty.value = false;
  });

  it("lets the user leave without asking while nothing has changed", async () => {
    const router = await mountPage();

    await router.push("/products");

    expect(router.currentRoute.value.path).toBe("/products");
    expect(document.body.querySelector("[role=dialog]")).toBeNull();
  });

  it("asks before leaving, and stays put when the user keeps editing", async () => {
    const router = await mountPage();
    dirty.value = true;

    const navigation = router.push("/products");
    await vi.waitFor(() => expect(button("Yes, leave")).toBeDefined());
    expect(document.body.querySelector("[role=dialog]")!.textContent).toContain("Leave without saving?");
    expect(document.body.querySelector("[role=dialog]")!.textContent).toContain("Are you sure you want to leave?");
    button("Cancel")!.click();
    await navigation;

    expect(router.currentRoute.value.path).toBe("/");
  });

  it("leaves when the user confirms", async () => {
    const router = await mountPage();
    dirty.value = true;

    const navigation = router.push("/products");
    await vi.waitFor(() => expect(button("Yes, leave")).toBeDefined());
    button("Yes, leave")!.click();
    await navigation;

    expect(router.currentRoute.value.path).toBe("/products");
  });

  it("does not ask after skip()", async () => {
    const router = await mountPage();
    dirty.value = true;
    guard.skip();

    await router.push("/products");

    expect(router.currentRoute.value.path).toBe("/products");
    expect(document.body.querySelector("[role=dialog]")).toBeNull();
  });

  it("asks the browser to confirm a reload only while dirty", async () => {
    await mountPage();
    expect(beforeUnload()).toBe(false);

    dirty.value = true;
    expect(beforeUnload()).toBe(true);
  });

  it("stops listening once unmounted", async () => {
    await mountPage();
    dirty.value = true;
    mounted.splice(0).forEach(wrapper => wrapper.unmount());

    expect(beforeUnload()).toBe(false);
  });
});
