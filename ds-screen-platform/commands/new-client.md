---
description: Bootstrap a coded design-system project for a new client (prompt→screen machine)
argument-hint: <client-name> [prefix]
---

Bootstrap a new client design-system project from the bundled template.

Arguments given: `$ARGUMENTS` (first = client slug, e.g. `acme`; second = component prefix,
defaults to the slug; e.g. prefix `acme` → `<acme-button>`, `--acme-brand`).

Steps:

1. Determine the output directory: `<cwd>/<client>-ds` unless the user asked for another path.
   If the folder exists, stop and ask.
2. Run the bundled bootstrap (it copies the template and renames the `ds-*` prefix throughout):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-client.mjs" --name <client> --prefix <prefix> --out "<absolute output path>"
   ```

3. `cd` into the new folder and run `npm run verify` — must be green before anything else.
4. Tell the user their next three moves, concretely:
   - Set the Figma fileKey in `agents/fidelity.json` and `layouts.json` → `meta.figmaFileKey`.
   - Pull tokens: run Figma MCP `get_variable_defs` on a representative frame, then update the
     `:root` block in `ds/<prefix>-ds.js`. Every component re-themes from tokens.
   - Build components: one `define("<prefix>-…")` per Figma component
     (`get_metadata` → `get_screenshot` → code), then `npm run manifest`.
5. From then on, screen requests ("build the wallet screen") are handled by the
   `screen-builder` skill: read `ds/manifest.md`, compose real `<prefix-*>` components,
   `npm run build`, `npm run verify`. Never hand-roll a component inside a screen.
