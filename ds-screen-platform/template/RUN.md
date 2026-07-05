# RUN — the local loop

How to run, build, view, and verify. (For starting a new project, see `BOOTSTRAP.md`.)

## The 3 commands you'll actually use
```bash
npm run serve     # local server → http://localhost:8128
npm run verify    # manifest + build + lint (the gate). Exits non-zero on errors.
npm run lint:fix  # auto-tokenize hardcoded colors in screens
```

## View it
- **Gallery:** http://localhost:8128/ (every `<ds-*>` component, live)
- **Screens:** http://localhost:8128/screens/
- Or just double-click `component-gallery.html` / any `screens/*.html` — they're self-contained.

## Edit → see the change
1. Edit a component in `ds/ds.js` (one `define()` block; all colors via `--ds-*` tokens).
2. `npm run build` — re-inlines the DS into the gallery + every screen.
3. Refresh the browser.
4. `npm run verify` when done. Green = good.

## All scripts
| Command | Does | Needs install? |
|---|---|---|
| `npm run serve` (or `start`) | Server at :8128 | no |
| `npm run build` | Inline DS into gallery + screens, build screens index | no |
| `npm run manifest` | Regenerate `ds/manifest.md` / `.json` | no |
| `npm run lint` / `lint:fix` | DS-drift lint / auto-fix | no |
| `npm run verify` | manifest → build → lint (the gate) | no |
| `npm run snapshot` | Playwright baseline PNGs → `agents/baselines/` | yes ¹ |
| `npm run diff -- a.png b.png diff.png` | Pixel-diff two PNGs (% + heatmap) | yes ¹ |

¹ One-time for the visual tools only: `npm i && npx playwright install chromium`.

## Measure fidelity vs a reference (e.g. Figma)
1. `npm run snapshot` → baselines of your screens.
2. Save the reference PNG (Figma MCP `get_screenshot`, or a Dev Mode export) at matching width.
3. `npm run diff -- agents/baselines/<screen>.png <ref>.png diff.png` → prints **% mismatch** and writes a heatmap.

## Troubleshooting
- **Port busy:** `PORT=8200 npm run serve`.
- **Screen looks stale after a DS edit:** you forgot `npm run build`.
- **`npm run` not found:** you're not in the project root.
