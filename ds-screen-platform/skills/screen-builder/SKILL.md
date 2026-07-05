---
name: screen-builder
description: >-
  Build an app screen by composing REAL components from the project's coded
  design-system library (the <ds-*> web components in ds/ds.js, indexed in
  ds/manifest.md) instead of hand-rolling markup on the fly. Use this skill
  whenever the user asks to build, design, lay out, mock up, prototype, or
  generate any screen, view, page, flow, sheet, modal, or UI in this project —
  even if they never mention components, Figma, or the design system. The skill
  enforces a component-first workflow: read the manifest, pick a layout
  archetype, compose <ds-*> elements with live data, extend the library if a
  component is missing, and emit a manifest mapping every element to a real
  library component so nothing is invented. If the project has no coded library
  (no ds/ds.js), this skill does not apply.
---

> **Prefix note:** bootstrapped client projects rename the `ds-*` prefix — the library
> is `ds/<prefix>-ds.js` and tags are `<prefix>-*` (e.g. `<acme-button>`). Everywhere this
> document says `ds-`/`ds/ds.js`, substitute the project's actual prefix and library file;
> `ds/manifest.md` lists the real tags. The skill applies to any project with a `ds/*.js`
> library + generated `ds/manifest.md`.

# Component-First Screen Builder

## The one rule

> **Build screens by composing the coded `<ds-*>` components. Never re-implement a
> component inline, never embed base64 images.**

The design system is real, framework-free code: **`ds/ds.js`** defines the `<ds-*>` web
components (token-driven). Its compact index is **`ds/manifest.md`** — that file is your
component vocabulary. A screen is layout + data composed from those elements; the design
lives in the components, not in the screen.

Why this matters: every screen stays attributable to a real component, white-label
re-skinning keeps working (clients re-theme tokens, not your one-off CSS), and engineering
can map what you built back to the system. The moment you hand-write a button or a card in
a screen file, that breaks. You are smart enough to fake a plausible card — that's the
trap. Reuse the real one instead.

## The workflow (follow in order)

### 0. Preflight — load the vocabulary
Confirm the library exists and read its index. If it's missing, this skill doesn't apply.
```bash
ls ds/ds.js ds/manifest.md layouts.json
```
**Read `ds/manifest.md`** — every `<ds-*>` component, its attributes/flags, and a
copy-pasteable example. This is what you build from. (It's generated from the code by
`node ds/build-manifest.mjs`, so it's always current.)

### 1. Resolve the screen to a layout archetype
Read `layouts.json` and pick the archetype whose **slots** match the request. The
archetype's slot list is your skeleton — don't freestyle a layout. If none fits, pick the
closest and note the deviation in the manifest (step 5).

**Study the closest existing screen first.** `screens/` holds already-built, on-spec
screens. Open the nearest one and copy its real conventions — the device frame
(`.phone`), status bar, navigation chrome, section headers, and surface treatment. These
are ground truth for "what good looks like"; matching them is faster and more accurate
than inventing spacing.

### 2. Compose `<ds-*>` elements with live data
For each slot, pick the component from `ds/manifest.md` and fill its attributes with the
screen's real data. Include the library once (`npm run build` inlines it later):
```html
<script src="../ds/ds.js"></script>
<ds-card title="Account">
  <ds-list-item icon="user" title="Profile" subtitle="Name, email" value="›"></ds-list-item>
</ds-card>
<ds-button type="primary" size="lg" label="Continue"></ds-button>
```
Reach for the right altitude: a settings screen wants `ds-card` + `ds-list-item` rows, not
hand-built divs; a form wants `ds-field`, not a raw `<input>`.

**If reproducing a Figma node**, pull ground truth first with the Figma MCP:
`get_metadata` (structure), `get_variable_defs` (tokens — confirm they map to `--ds-*`),
and one `get_screenshot` (what's actually visible — build that).

### 3. If a component is missing, EXTEND THE LIBRARY (don't inline it)
If a slot genuinely has no `<ds-*>` match, **add it to `ds/ds.js`** as one
`define("ds-…", (el) => …)` block — copy the closest existing block, use only `--ds-*`
tokens — never approximate it in the screen file. Then regenerate the index so every
future screen gets it for free:
```bash
node ds/build-manifest.mjs
```
A flagged-and-built component is a good outcome; a hand-rolled card in a screen is the
failure this skill exists to prevent.

### 4. Surfaces and spacing (don't skip)
Match the conventions the coded components already carry — borders, shadows, dividers,
radii come from the DS tokens. If you wrap components in your own container, style it with
`var(--ds-*)` tokens only; the linter (`npm run lint`) flags raw hex values. Use the slot's
real component (e.g. a row of action tiles), not a lookalike layout you invent.

### 5. Build the file + emit a components manifest
Write the screen at `screens/<screen-name>.html`: copy the `.phone` frame from
`screens/example.html`, keep `<script src="../ds/ds.js"></script>` in the head, then run
`node build-screens.mjs` to inline the DS so the file renders anywhere (file://, preview).

Alongside it, **always** write `screens/<screen-name>.components.json` mapping every
element to the real library component behind it — the artifact that proves nothing was
fabricated:
```json
{
  "screen": "settings",
  "archetype": "ListScreen",
  "slots": [
    { "slot": "header", "components": [ { "tag": "ds-button" } ] },
    { "slot": "list",   "components": [ { "tag": "ds-card" }, { "tag": "ds-list-item" } ] }
  ],
  "tokensUsed": ["--ds-brand", "--ds-bg"],
  "gaps": []
}
```
If something the screen needs has **no** library component (even after step 3), list it in
`"gaps"` with a note and surface it to the user — never invent one to fill the hole.

### 6. Audit before you finish (the gate)
Run the bundled auditor — it checks that every `tag` you claim is a real `<ds-*>`
component in the library, catching fabricated or misnamed elements deterministically:
```bash
npm run audit -- screens/<screen-name>.components.json
```
If it reports unmatched components, you either misnamed a real tag (fix it against
`ds/manifest.md`) or you invented one (build it into the library per step 3, or move it to
`gaps`). Then `npm run verify` (manifest + build + lint) must be green. Don't present the
screen until both pass or every unmatched item is an acknowledged gap.

## Quick self-check
Glance through the rendered markup and ask of each visually distinct element: *which
`<ds-*>` component is this?* If an element has no answer, you fabricated it — go back to
step 2 and resolve it for real.
