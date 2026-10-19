import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { Component, Ref } from "vue";
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

/** Mounts a `v-model` component with the value held in a ref, so edits come back in as they would from a parent form. */
export async function mountWithModel<T>(component: Component, initial: T, props: Record<string, unknown> = {}) {
  const model = ref(initial) as Ref<T>;
  const app = await mountSuspended({
    render: () =>
      h(UApp, null, {
        default: () =>
          h(component, {
            ...props,
            modelValue: model.value,
            "onUpdate:modelValue": (value: T) => {
              model.value = value;
            },
          }),
      }),
  });
  return { wrapper: app.findComponent(component), model };
}
