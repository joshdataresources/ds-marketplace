/*
  visual-diff.mjs — pixel-diff two PNGs and report the mismatch.

  Two uses:
    1. Regression: diff a fresh snapshot against a stored baseline (catch DS changes that
       silently shift a screen).
    2. Figma fidelity: diff a screen render against the Figma node PNG. Pull the reference with
       the Figma MCP get_screenshot at a matching width, save it, then run this.

  Images are cropped to their overlapping top-left region (handles tall scroll screens / minor
  size differences); for a true full-screen diff, capture both at the same dimensions.

  Setup (once):  npm i && npx playwright install chromium   (installs pixelmatch + pngjs too)
  Usage:         node agents/visual-diff.mjs <actual.png> <reference.png> [diff.png] [--threshold 0.1]
  Exit 0 if mismatch < 2% of compared pixels, else 1.
*/
import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const args = process.argv.slice(2);
const [actualPath, refPath, diffPath = "diff.png"] = args.filter((a) => !a.startsWith("--"));
const threshold = Number((args.find((a) => a.startsWith("--threshold")) || "").split(/[= ]/)[1]) || 0.1;
if (!actualPath || !refPath) { console.error("usage: visual-diff.mjs <actual.png> <reference.png> [diff.png]"); process.exit(2); }

const a = PNG.sync.read(fs.readFileSync(actualPath));
const b = PNG.sync.read(fs.readFileSync(refPath));
const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);

function crop(src, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (src.width * y + x) << 2, di = (w * y + x) << 2;
    out.data[di] = src.data[si]; out.data[di + 1] = src.data[si + 1];
    out.data[di + 2] = src.data[si + 2]; out.data[di + 3] = src.data[si + 3];
  }
  return out;
}
const ca = crop(a, w, h), cb = crop(b, w, h), diff = new PNG({ width: w, height: h });
const mismatched = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold });
fs.writeFileSync(diffPath, PNG.sync.write(diff));

const total = w * h, pct = (mismatched / total) * 100;
console.log(`compared ${w}×${h} (${total.toLocaleString()} px)`);
console.log(`mismatched: ${mismatched.toLocaleString()} px (${pct.toFixed(2)}%)`);
console.log(`diff → ${diffPath}`);
if (a.width !== b.width || a.height !== b.height) console.log(`note: sizes differ — compared overlapping region only`);
process.exit(pct < 2 ? 0 : 1);
