import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { Component } from "vue";
import { UApp } from "#components";

/**
 * Mounts a component inside `UApp`, for components that use Nuxt UI parts needing its providers
 * (tooltips, toasts). Returns the wrapper of the component itself, not the app.
 */
export async function mountInApp(component: Component, props: Record<string, unknown> = {}) {
  const app = await mountSuspended({
    render: () => h(UApp, null, { default: () => h(component, props) }),
  });
  return app.findComponent(component);
}
