# Vue guide

Vue 3.5 through Nuxt 4. Every component and page uses `<script setup lang="ts">` with the Composition API.

## Props

Destructure props straight from `defineProps`, with defaults as destructure defaults:

```ts
const { label, size = "md", disabled = false } = defineProps<{
  label: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}>();
```

This replaces `withDefaults`. Destructured props stay reactive, but only when they are read inside a reactive scope. When you pass one to `watch`, a composable or anything else that tracks reactivity, wrap it in a getter: `watch(() => size, ...)`, `useFoo(() => label)`.

## Events

Declare events with the named-tuple type syntax, one key per event:

```ts
const emit = defineEmits<{
  save: [id: string];
  close: [];
}>();
```

Use it in place of the call-signature form (`(e: "save", id: string): void`). Call `emit("save", id)` everywhere, templates included. For a two-way bound value, use `defineModel()` instead of a prop and an `update:` event.

## Slots

Type slots with `defineSlots`, returning `VNode[]` from `vue`. Never use `any`:

```ts
import type { VNode } from "vue";

const slots = defineSlots<{
  default: () => VNode[];
  actions?: () => VNode[];
}>();
```

Read them through the returned `slots` object (or `useSlots()`), templates included: `v-if="slots.actions"`.

## TypeScript

Avoid `any`. Use a precise type, `unknown` with narrowing, or a generic instead.

## Composables

- Put reusable stateful logic in a `use*` composable in `app/composables/` (auto-imported).
- Reach for VueUse (`useDebounceFn`, `useEventListener`, `useLocalStorage`, `onClickOutside`, ...) before writing your own listener, timer or browser-API wrapper. It is not a direct dependency yet: the first time you need it, add `@vueuse/nuxt` to `modules` in `nuxt.config.ts` so its composables are auto-imported.
- Template refs use `useTemplateRef("name")`.
