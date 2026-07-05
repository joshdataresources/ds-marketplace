# PROCESS — how the whole design-system loop works

A product-agnostic map of the pipeline, so you can stand up a new coded design system for any
product. `xx-` / `--xx-*` are placeholders for your prefix (this starter uses `ds-` / `--ds-*`).

**One sentence:** Figma is the design source of truth → you *extract* tokens, glyphs, and component
specs into **one coded file** (`ds/ds.js`), which is THE source of truth → a generated manifest is
the model's front door → screens are composed from it and built self-contained → three gates verify
it (drift, per-component fidelity, screen regression) → re-skin by changing tokens.

> **What ships in this starter:** the coded DS, manifest, build, serve, and the **lint + fidelity +
> screen-regression** gates. The **glyph-import** step (`glyphs:extract` / `glyphs` in the diagram)
> is an optional add-on — the starter ships hand-authored `ds-icon`/`ds-badge` glyphs. When you want
> to import a real Figma icon set, port `pipeline/extract-figma-glyphs.mjs` + `bake-glyphs.mjs` from
> the reference implementation.

---

## Big picture

```mermaid
flowchart TB
  subgraph FIGMA["Figma — design source of truth"]
    VARS["Variables / tokens"]
    GLY["Icon + badge sets"]
    CMP["Component frames"]
    SCR["Screen frames"]
  end

  subgraph EX["1 · Extract  (once, or when the design changes)"]
    T["get_variable_defs<br/>→ :root --xx-* tokens"]
    G["npm run glyphs:extract → figma-glyphs.json<br/>npm run glyphs → bake into ds.js + icons.json"]
    C["get_metadata + get_design_context + get_screenshot<br/>→ author ONE define() per component"]
  end

  subgraph CODE["2 · Coded design system — THE source of truth"]
    DSJS["ds/ds.js<br/>tokens + &lt;xx-*&gt; components + icon()/badge()"]
    MAN["npm run manifest → ds/manifest.md<br/>(the front-door index)"]
  end

  subgraph SCRN["3 · Build screens"]
    CO["read manifest.md → compose &lt;xx-*&gt; with live data"]
    BS["npm run build → self-contained screens/*.html + index"]
    SV["npm run serve → localhost:8128"]
  end

  subgraph VFY["4 · Verify — gates"]
    LI["npm run lint → token drift"]
    FI["npm run fidelity → component vs Figma node (%)"]
    SN["npm run snapshot + diff → whole-screen regression"]
  end

  VARS --> T --> DSJS
  GLY --> G --> DSJS
  CMP --> C --> DSJS
  DSJS --> MAN --> CO
  SCR -. study closest screen .-> CO
  CO --> BS --> SV
  BS --> LI
  DSJS --> FI
  BS --> SN
  LI --> Q{all green?}
  FI --> Q
  SN --> Q
  Q -- "no → fix the define()" --> DSJS
  Q -- yes --> SHIP["ship"]
  SHIP -. "re-skin: change --xx-* tokens → rebuild" .-> DSJS
```

## The fidelity loop (the part you just added), zoomed in

```mermaid
flowchart LR
  NODE["Figma node id<br/>(listed in agents/fidelity.json)"] -->|"get_screenshot + curl"| REF["figma/&lt;id&gt;.png"]
  HARN["component-harness.html<br/>render ONE &lt;xx-*&gt; in isolation"] -->|"headless screenshot"| OURS["ours/&lt;id&gt;.png"]
  REF --> DIFF["fidelity.mjs<br/>pixel diff · mask QR/charts · flatten alpha"]
  OURS --> DIFF
  DIFF --> PCT{"mismatch &lt; 2%?"}
  PCT -- "OFF / ~" --> FIX["get_design_context →<br/>edit the define() in ds.js → npm run build"]
  FIX --> HARN
  PCT -- "OK" --> PASS["matches Figma ✓"]
```

---

## ASCII overview (for plain editors)

```
        FIGMA (design source of truth)
   tokens · glyph sets · component frames · screen frames
        │            │              │                 │
        ▼            ▼              ▼                 │ (reference)
 [get_variable]  [glyphs:extract] [get_metadata/                │
   _defs          → bake]          design_context/screenshot]   │
        │            │              │                            │
        └──────┬─────┴──────┬───────┘                            │
               ▼            ▼                                    │
        ╔══════════════════════════════════════╗                │
        ║  ds/ds.js   ← THE SOURCE OF TRUTH     ║                │
        ║  tokens + <xx-*> components + glyphs  ║                │
        ╚══════════════════════════════════════╝                │
               │ build-manifest                                  │
               ▼                                                 │
        ds/manifest.md  (front-door index) ◄─────────────────────┘
               │ compose <xx-*>
               ▼
        build-screens → self-contained screens/*.html + index
               │ serve → localhost:8128
               ▼
        ┌──────────── VERIFY (gates) ────────────┐
        │ lint (drift) · fidelity (vs node %) ·   │
        │ snapshot + diff (screen regression)     │
        └─────────────────┬───────────────────────┘
            green? ──no──► fix the define() (back to ds/ds.js)
              │yes
              ▼
            ship  ──re-skin: change --xx-* tokens, rebuild──► (back to ds/ds.js)
```

---

## Legend — each step → command → files

| Phase | What | Command | Key files |
|---|---|---|---|
| **Extract · tokens** | Pull Figma variables → CSS tokens | Figma MCP `get_variable_defs` | `ds/ds.js` `:root{ --xx-* }` |
| **Extract · glyphs** | Icon/badge sets → flattened SVG, baked in | `npm run glyphs:extract` then `npm run glyphs` | `pipeline/extract-figma-glyphs.mjs`, `pipeline/bake-glyphs.mjs`, `figma-glyphs.json`, `icons.json` |
| **Extract · components** | Per component: read node, author code | `get_metadata` + `get_design_context` + `get_screenshot` | one `define()` block in `ds/ds.js` |
| **Codify** | Generate the component index | `npm run manifest` | `ds/build-manifest.mjs` → `ds/manifest.md` |
| **Build screens** | Compose + inline DS, make self-contained | `npm run build` | `build-screens.mjs` → `screens/*.html`, `screens/index.html` |
| **Preview** | Serve gallery + screens | `npm run serve` | `serve.mjs` → `:8128/` and `/screens/` |
| **Gate · drift** | No hardcoded token-equal colors | `npm run lint` (`lint:fix`) | `agents/lint-ds.mjs` |
| **Gate · fidelity** | Each component vs its Figma node | `npm run fidelity` | `agents/fidelity.json`, `component-harness.html`, `agents/fidelity.mjs` |
| **Gate · regression** | Whole screens vs baselines / Figma | `npm run snapshot`, `npm run diff` | `agents/snapshot.mjs`, `agents/visual-diff.mjs` |
| **All gates** | The one command before "done" | `npm run verify` | manifest → build → lint |
| **Re-skin** | Whole product re-themes | edit `--xx-*` → `npm run build` | `ds/ds.js` `:root` |

---

## Starting a new product (the short version)

1. **Copy the machine.** `cp -R template my-new-app` (the `template/` here is the stripped, reusable
   starter — full machine + a tokens-only DS). See `template/BOOTSTRAP.md`.
2. **Point at the new Figma file**, set your prefix, paste the new `--xx-*` tokens.
3. **Run the loop above:** glyphs → components (fan out subagents, one `define()` each) → manifest
   → screens → `npm run verify` → `npm run fidelity` to gate against Figma.
4. **Re-skin / iterate** by changing tokens.

**The one rule that makes all of this work:** never hand-roll a component inside a screen — if it's
not in `manifest.md`, add it to `ds/ds.js` first. That's what keeps screens coherent and makes a
token-only re-skin theme the whole product at once.
