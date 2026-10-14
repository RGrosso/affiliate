import type { MaybeRefOrGetter } from "vue";

export function useUnsavedChangesGuard(isDirty: MaybeRefOrGetter<boolean>) {
  const { confirm } = useConfirmDialog();
  let skipped = false;

  // A router-level guard rather than onBeforeRouteLeave, which only works inside a routed page component.
  // Query and hash changes on the same path aren't leaving the page, so they don't prompt.
  const removeGuard = useRouter().beforeEach(async (to, from) => {
    if (skipped || !toValue(isDirty) || to.path === from.path) return true;
    return confirm({
      title: "Leave without saving?",
      description: "You have unsaved changes. If you leave this page, they'll be lost.",
      question: "Are you sure you want to leave?",
      confirmLabel: "Yes, leave",
      cancelLabel: "Cancel",
      color: "error",
    });
  });

  // Browsers ignore the message and show their own prompt, but need preventDefault to show it at all
  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (skipped || !toValue(isDirty)) return;
    event.preventDefault();
  }

  onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", onBeforeUnload);
    removeGuard();
  });

  /** Lets the next navigation through without asking, e.g. the redirect after a successful save. */
  function skip() {
    skipped = true;
  }

  return { skip };
}
