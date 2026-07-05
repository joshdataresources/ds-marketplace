# BOOTSTRAP — start a new project from this template

This is a **coded design system + screen builder**: screens are composed from real `<ds-*>` web
components, never hand-rolled markup. One source of truth (`ds/ds.js`), a generated front-door
manifest, self-contained output, and a verify gate. Re-skin by changing tokens.

## 0. Copy it
```bash
cp -R template my-new-app && cd my-new-app
```
Everything here is dependency-free Node — it runs immediately. (Only the visual tools
`snapshot`/`diff` need `npm i && npx playwright install chromium`.)

## 1. (optional) Rename the prefix
The components ship as `ds-*`. To rename to your own (e.g. `xy-*`):
- In `ds/ds.js`: replace `--ds-` → `--xy-` and `ds-` tag names → `xy-`.
- In `build-screens.mjs`, `agents/lint-ds.mjs`: replace `ds-inline`→`xy-inline`, `ds/ds.js` path if you renamed the file, and `--ds-`→`--xy-` in the linter.
Keeping `ds-*` is totally fine — skip this step.

## 2. Set your tokens
Open `ds/ds.js` → the `:root{…}` block. Replace the colors/radii/spacing with your project's.
If you have a Figma file, pull them exactly: ask Claude to run the Figma MCP `get_variable_defs`
on a representative frame and paste the result here. **Tokens are the whole white-label surface** —
get these right and every component re-themes.

## 3. Build your components (the loop)
For each component in your design:
1. **Read the design.** With a Figma node: `get_metadata` (structure) + `get_variable_defs`
   (tokens) + one `get_screenshot` (ground truth — confirms what's actually visible).
2. **Add ONE `define()` block** to `ds/ds.js` (copy the closest existing one). All colors via
   `var(--ds-*)` — never hardcode.
3. **Add a tile** to `component-gallery.html` so it's visible.
4. `npm run manifest` — refresh `ds/manifest.md` (the vocabulary).

Building many? Run a few Claude subagents in parallel, each owning one component keyed to its own
node — they don't conflict (each is an isolated `define()` block). Merge, then regenerate the manifest.

## 4. Build screens
1. Read `ds/manifest.md` for the component vocabulary.
2. Copy `screens/example.html` → `screens/<name>.html`; compose `<ds-*>` in the `.phone` frame.
3. `npm run build` (inlines the DS, builds the screens index).
4. `npm run verify` — green = no drift.
5. View at `http://localhost:8128/screens/` (after `npm run serve`).

## 5. Re-skin (the payoff)
Change the `--ds-*` tokens → `npm run build`. The whole app + gallery re-theme at once.

---

### The rule that keeps it coherent
**Never hand-roll a component inside a screen.** If the manifest doesn't have it, add it to
`ds/ds.js` first. That single rule is why screens stay consistent and a re-skin works everywhere.

See `RUN.md` for the day-to-day commands.
