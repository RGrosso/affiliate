# App guide

Brand, theme and core components for the Nuxt app. The human-facing overview of the theme files is in the README's "Brand and theme" section.

## Brand

The site name is a placeholder. Always render it from `SITE_NAME` in `shared/utils/site.ts`, so a rename is a one-line change.

## Colours

The theme lives in `app/assets/css/main.css` (scales, fonts, surfaces) and `app/app.config.ts` (which scale each Nuxt UI colour uses).

- Colour components with the semantic colours: `primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`. Each is shaded 600 in light mode and 200 in dark mode, so text on them passes contrast in both. A raw palette like `yellow` or `green` skips that shading.
  - Two exceptions, both set in `app.config.ts` and `main.css`: `warning` (yellow, `sunny`) is too light for text, so its text uses the 800/200 tones while subtle alerts, badges and solid buttons take the pale and bright yellows. `error` (`crimson`) uses 400 in dark mode and a pale red for subtle alerts and badges so it reads red, not pink.
- Style surfaces and text with Nuxt UI's semantic classes (`bg-default`, `bg-muted`, `bg-elevated`, `text-default`, `text-muted`, `text-highlighted`, `border-default`, `text-primary`), so light and dark mode follow the theme. Fixed Tailwind shades like `gray-500` stay the same in both modes.
- `action` (orange) is for the main call-to-action button on a page. Solid action buttons get dark navy text from `app.config.ts`; white fails contrast on orange.
- Show "We may earn a commission, at no cost to you." near affiliate links.

## Core components

When a Nuxt UI component is used in several places, wrap it in a core component in `app/components/core/` (auto-imported with a `Core` prefix). The wrapper fixes the variant, size, icons and colours once, so every use looks the same and a restyle is a one-file change. Callers pass only what differs: the content and a small typed prop for the choice that varies.

Use the core component wherever one exists:

| Component | Wraps | Use for |
| --- | --- | --- |
| `<CoreContainer>` | `UContainer` | Every page-width wrapper; use it in place of `UContainer`. `variant="padded"` adds vertical spacing for a page's main content. `variant="full"` is a full-width band (put the background on it) with page-width content inside, as in the homepage hero. `as` sets the element, e.g. `as="section"`. |
| `<CoreAlert variant="warning" title="…" />` | `UAlert` | Inline messages. `variant` is `success`, `error`, `warning` or `info` and sets the colour and icon. Also takes `description`, `actions` and an optional `icon` override. |
| `<CoreTag label="Sample" color="warning" />` | `UBadge` | Small labels on products. `color` defaults to `neutral`. |
| `<CoreButtonBar :show="dirty">` | (custom) | The sticky "Unsaved changes" bar on forms; buttons go in the default slot. |

Add a row here when you add a core component.
