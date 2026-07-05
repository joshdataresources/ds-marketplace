/*
  snapshot.mjs — render every screen headless and save a baseline PNG.

  Screens are self-contained (the DS is inlined by build-screens.mjs), so they load over file://
  with no server. Capture golden baselines, then re-capture after a DS change and diff old vs new
  with visual-diff.mjs to catch unintended visual regressions.

  Setup (once):  npm i && npx playwright install chromium
  Usage:         node agents/snapshot.mjs            # all screens → agents/baselines/
                 node agents/snapshot.mjs example     # one screen
*/
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.join(here, "baselines");
fs.mkdirSync(outDir, { recursive: true });

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
let files = fs.readdirSync(path.join(root, "screens")).filter((f) => f.endsWith(".html") && f !== "index.html");
if (only.length) files = files.filter((f) => only.some((o) => f.includes(o)));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 440, height: 900 }, deviceScaleFactor: 2 });
for (const f of files) {
  await page.goto(pathToFileURL(path.join(root, "screens", f)).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(250); // let custom elements upgrade
  const phone = await page.$(".phone");
  const out = path.join(outDir, f.replace(/\.html$/, ".png"));
  await (phone || page).screenshot({ path: out });
  console.log("snapped", path.relative(root, out));
}
await browser.close();
console.log(`${files.length} baseline(s) → ${path.relative(root, outDir)}`);
