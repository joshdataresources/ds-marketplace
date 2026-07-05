# Agent instructions — coded design system + screen builder

This project is a **coded design system + screen builder**. Screens are composed from real
`<ds-*>` web components defined in `ds/ds.js` — never hand-rolled markup.

## The one rule

Build screens by composing the coded `<ds-*>` components. Never re-implement a component
inline in a screen. If a component is missing, add ONE `define("ds-…", (el) => …)` block to
`ds/ds.js` (copy the closest existing block, tokens only), then run `npm run manifest`.

## Source of truth

- `ds/ds.js` — the component library (tokens + `<ds-*>` components). THE source of truth.
- `ds/manifest.md` — generated component index (tag · attributes · example). **Read this
  first to know what exists.** Regenerate: `npm run manifest`.
- `layouts.json` — screen layout archetypes (slot lists — your screen skeleton).
- `screens/` — built screens; study the closest one before building a new one.

## Building a screen (workflow)

1. Read `ds/manifest.md` (the vocabulary) and pick an archetype from `layouts.json`.
2. Study the closest existing screen in `screens/`; copy its `.phone` frame and conventions.
3. Compose `<ds-*>` elements with live data into `screens/<name>.html`; keep
   `<script src="../ds/ds.js"></script>` in the head.
4. Missing component → extend `ds/ds.js`, never inline. Then `npm run manifest`.
5. Write `screens/<name>.components.json` mapping every element to a real library tag;
   list anything unresolvable under `"gaps"` — never invent a component.
6. Gates: `npm run build` → `npm run verify` (must be green) →
   `npm run audit -- screens/<name>.components.json`.

## Figma

Reproducing a Figma node: `get_metadata` (structure) + `get_variable_defs` (tokens → map to
`--ds-*`) + one `get_screenshot` (ground truth — build what's visible). Fidelity gate:
`npm run fidelity`.

## Rules

- All colors via `var(--ds-*)` tokens — never raw hex (the linter flags it).
- Components hold design; screens hold layout + data.
- Don't embed base64 image renders.
- Commands: `npm run serve` (localhost:8128) · `build` · `verify` · `audit` · `fidelity`.
