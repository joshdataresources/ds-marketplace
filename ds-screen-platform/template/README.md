# DS Starter

A reusable starter for building a **coded, white-label design system + screen builder**. Screens
are composed from real `<ds-*>` web components — never hand-rolled markup — so they stay coherent
and re-skin from a single set of tokens.

## What's in the box
```
ds/ds.js              ← THE design system: --ds-* tokens + <ds-*> components (source of truth)
ds/build-manifest.mjs ← generates ds/manifest.md (the component "front door")
ds/manifest.md        ← compact index of every component — read this to know what exists
build-screens.mjs     ← inlines the DS into screens + gallery (self-contained output)
serve.mjs             ← static server (gallery at /, screens at /screens/)
component-gallery.html← live, browsable gallery of every component
screens/example.html  ← starter screen; copy it to make new ones
agents/lint-ds.mjs    ← drift linter (flags hardcoded colors that equal a token)
agents/snapshot.mjs   ← Playwright baseline PNGs   (optional, needs install)
agents/visual-diff.mjs← pixel-diff two PNGs → % match (optional, needs install)
agents/component-harness.html ← renders one <ds-*> in isolation for fidelity checks
agents/fidelity.mjs   ← per-component pixel diff vs Figma node (%)   (optional, needs install)
agents/fidelity.json  ← the fidelity cases (set fileKey + add cases as you build)
agents/FIDELITY.md    ← how the fidelity gate works
skills/screen-builder ← the screen-building procedure (for Claude Code)
PROCESS.md            ← the whole pipeline as a diagram (start here)
BOOTSTRAP.md          ← start a new project (tokens → components → screens → re-skin)
RUN.md                ← day-to-day commands
```

## Quick start
```bash
npm run serve     # → http://localhost:8128  (gallery)  ·  /screens/  (screens)
npm run verify    # manifest + build + lint — the gate
```
Core scripts are dependency-free. New project? See **BOOTSTRAP.md**.

## The one rule
Never hand-roll a component inside a screen. If it's not in `ds/manifest.md`, add it to `ds/ds.js`
first, regenerate the manifest, then use it. That's what keeps every screen consistent and makes a
token-only re-skin work everywhere.
