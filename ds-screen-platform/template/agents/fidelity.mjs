/*
  fidelity.mjs — per-component fidelity check against Figma.

  For each case in fidelity.json: render the <ds-*> in isolation (component-harness.html), screenshot
  just that element, and pixel-diff it against the matching Figma node PNG. Prints a % table and
  writes heatmaps. Masked regions (QR codes, charts) are blanked in BOTH images first.

  Pipeline:
    1. node agents/fidelity.mjs            → renders ours/<id>.png; reports which figma refs are missing
    2. fetch each missing ref into agents/fidelity/figma/<id>.png   (see FIDELITY.md — uses the Figma MCP)
    3. node agents/fidelity.mjs            → now also diffs → ours vs figma % per case + diff/<id>.png

  Setup (once):  npm i && npx playwright install chromium
  Usage:         node agents/fidelity.mjs [idSubstring ...]
*/
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(here, "fidelity.json"), "utf8"));
const mk = (s) => { const p = path.join(here, "fidelity", s); fs.mkdirSync(p, { recursive: true }); return p; };
const oursDir = mk("ours"), figDir = mk("figma"), diffDir = mk("diff");

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const cases = only.length ? cfg.cases.filter((c) => only.some((o) => c.id.includes(o))) : cfg.cases;

const harness = pathToFileURL(path.join(here, "component-harness.html")).href;
const urlFor = (c) => {
  const q = new URLSearchParams({ tag: c.tag, w: String(c.w), bg: "white" });
  for (const [k, v] of Object.entries(c.params || {})) q.set(k, v);
  return `${harness}?${q.toString()}`;
};

const loadPNG = (p) => PNG.sync.read(fs.readFileSync(p));
function resizeNN(src, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(src.width - 1, Math.floor((x * src.width) / w));
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / h));
    const si = (src.width * sy + sx) << 2, di = (w * y + x) << 2;
    out.data[di] = src.data[si]; out.data[di + 1] = src.data[si + 1];
    out.data[di + 2] = src.data[si + 2]; out.data[di + 3] = src.data[si + 3];
  }
  return out;
}
function flattenWhite(png) { // composite over white so transparent refs match the harness bg
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    d[i] = Math.round(d[i] * a + 255 * (1 - a));
    d[i + 1] = Math.round(d[i + 1] * a + 255 * (1 - a));
    d[i + 2] = Math.round(d[i + 2] * a + 255 * (1 - a));
    d[i + 3] = 255;
  }
}
function fillRect(png, f, rgb = [128, 128, 128]) {
  const x0 = Math.max(0, Math.floor(f.x * png.width)), y0 = Math.max(0, Math.floor(f.y * png.height));
  const x1 = Math.min(png.width, Math.ceil((f.x + f.w) * png.width)), y1 = Math.min(png.height, Math.ceil((f.y + f.h) * png.height));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (png.width * y + x) << 2; png.data[i] = rgb[0]; png.data[i + 1] = rgb[1]; png.data[i + 2] = rgb[2]; png.data[i + 3] = 255; }
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
const results = [];
for (const c of cases) {
  await page.setViewportSize({ width: Math.max(c.w + 60, 420), height: 920 });
  await page.goto(urlFor(c), { waitUntil: "networkidle" });
  await page.waitForTimeout(200); // custom-element upgrade
  const el = await page.$("#host > *");
  if (!el) { results.push({ id: c.id, err: "component did not render" }); continue; }
  const oursPath = path.join(oursDir, c.id + ".png");
  await el.screenshot({ path: oursPath });

  // masked regions, as fractions of the element box (non-deterministic content)
  const masks = [];
  for (const sel of c.mask || []) {
    const fr = await page.evaluate((s) => {
      const host = document.querySelector("#host > *"), m = document.querySelector(s);
      if (!host || !m) return null;
      const H = host.getBoundingClientRect(), M = m.getBoundingClientRect();
      return { x: (M.left - H.left) / H.width, y: (M.top - H.top) / H.height, w: M.width / H.width, h: M.height / H.height };
    }, sel);
    if (fr) masks.push(fr);
  }

  const figPath = path.join(figDir, c.id + ".png");
  if (!fs.existsSync(figPath)) { results.push({ id: c.id, node: c.node, missing: true, ours: path.relative(root, oursPath) }); continue; }

  const ours = loadPNG(oursPath);
  let fig = loadPNG(figPath);
  if (fig.width !== ours.width || fig.height !== ours.height) fig = resizeNN(fig, ours.width, ours.height);
  flattenWhite(ours); flattenWhite(fig);
  for (const m of masks) { fillRect(ours, m); fillRect(fig, m); }
  const diff = new PNG({ width: ours.width, height: ours.height });
  const mm = pixelmatch(ours.data, fig.data, diff.data, ours.width, ours.height, { threshold: 0.1 });
  fs.writeFileSync(path.join(diffDir, c.id + ".png"), PNG.sync.write(diff));
  results.push({ id: c.id, pct: (mm / (ours.width * ours.height)) * 100, masked: masks.length });
}
await browser.close();

console.log("\nComponent fidelity vs Figma  (file " + cfg.fileKey + ")\n" + "-".repeat(56));
let missing = 0;
for (const r of results) {
  if (r.err) { console.log(`  ✗ ${r.id.padEnd(34)} ${r.err}`); continue; }
  if (r.missing) { missing++; console.log(`  · ${r.id.padEnd(34)} figma ref missing (node ${r.node})`); continue; }
  const tag = r.pct < 2 ? "OK " : r.pct < 8 ? "~  " : "OFF";
  console.log(`  ${tag} ${r.id.padEnd(34)} ${r.pct.toFixed(2)}%${r.masked ? `  (${r.masked} masked)` : ""}`);
}
if (missing) console.log(`\n${missing} ref(s) missing — fetch into agents/fidelity/figma/<id>.png (see FIDELITY.md), then re-run.`);
console.log("");
