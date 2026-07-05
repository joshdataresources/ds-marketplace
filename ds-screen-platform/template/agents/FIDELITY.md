# Component fidelity gate

Prove a `<ds-*>` component matches its Figma node — with a number, not an eyeball.

## Pieces
- **`fidelity.json`** — the cases. Each maps ONE rendered component to ONE Figma node (the exact
  variant), with the attributes to render and any `mask` selectors for non-deterministic regions
  (QR codes, charts). Set `fileKey` to your Figma file.
- **`component-harness.html`** — renders one `<ds-*>` in isolation from URL params. Eyeball any case:
  `/agents/component-harness.html?tag=ds-button&w=200&type=primary&label=Continue`
- **`fidelity.mjs`** — renders each case headless, pixel-diffs vs the Figma ref, prints a % table
  and writes `agents/fidelity/diff/<id>.png` heatmaps.

## Loop (run by Claude)
1. `npm run fidelity` → renders `agents/fidelity/ours/<id>.png`, lists which Figma refs are missing.
2. Fetch each ref (Figma MCP): `get_screenshot { fileKey, nodeId: <case.node> }` → `curl -o agents/fidelity/figma/<id>.png "<url>"`.
3. `npm run fidelity` again → table: `OK` < 2% · `~` 2–8% · `OFF` > 8%. Open the diff heatmap to see where.
4. For any `OFF`: `get_design_context { nodeId }` for the exact spec → fix the one `define()` in
   `ds/ds.js` (all colors via `var(--ds-*)`) → `npm run build` → re-check until `OK`.

Setup once: `npm i && npx playwright install chromium`.

## Notes
- QR/charts/photos never match pixel-for-pixel — list them in `mask`.
- The ref is scaled to the rendered size and transparent refs are flattened onto white before diffing.
- A low % means pixels match, not behavior. Use `npm run verify` for token drift, `npm run snapshot`/`diff` for whole screens.
