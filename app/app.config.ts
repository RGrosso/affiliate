// Tinting --ui-warning gives a muddy beige and --ui-error a pink, so subtle alerts and badges use the scales' pale tones
const SUBTLE_WARNING = "bg-sunny-50 ring-sunny-300 dark:bg-sunny-950 dark:ring-sunny-800";
const SUBTLE_ERROR = "bg-crimson-50 dark:bg-crimson-950";

export default defineAppConfig({
  ui: {
    colors: {
      // Signal Blue (active)
      primary: "signal",
      secondary: "coral",
      action: "action", // orange buy buttons: <UButton color="action">
      neutral: "slate",

      // Status colours, shaded like primary in main.css so text on them stays readable
      success: "forest",
      info: "sky",
      warning: "sunny",
      error: "crimson",

      // Ocean Teal
      // primary: "ocean",
      // secondary: "amber",
      // neutral: "slate",

      // Forest Green
      // primary: "forest",
      // secondary: "sky",
      // neutral: "stone",
    },
    button: {
      compoundVariants: [
        // White text fails contrast on orange and yellow, so these solid buttons use dark text
        { color: "action", variant: "solid", class: "text-signal-900" },
        {
          color: "warning",
          variant: "solid",
          class:
            "bg-sunny-400 hover:bg-sunny-300 active:bg-sunny-300 disabled:bg-sunny-400 aria-disabled:bg-sunny-400 text-sunny-900 focus-visible:outline-sunny-400",
        },
      ],
    },
    // The global `p` rule in main.css restyles these labels and descriptions (they render as <p>) to 16px / 26px, which pushes the
    // control off-centre against the first line. Pin them to the size and line height the control's own row height is built for.
    radioGroup: {
      slots: { label: "text-sm leading-5", description: "text-sm leading-5" },
    },
    checkbox: {
      slots: { label: "text-sm leading-5", description: "text-sm leading-5" },
    },
    alert: {
      compoundVariants: [
        { color: "warning", variant: "subtle", class: { root: SUBTLE_WARNING } },
        { color: "error", variant: "subtle", class: { root: SUBTLE_ERROR } },
      ],
    },
    badge: {
      compoundVariants: [
        { color: "warning", variant: "subtle", class: SUBTLE_WARNING },
        { color: "error", variant: "subtle", class: SUBTLE_ERROR },
      ],
    },
  },
});
