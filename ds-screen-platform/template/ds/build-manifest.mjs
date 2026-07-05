/*
  build-manifest.mjs — generate ds/manifest.md + ds/manifest.json from ds/ds.js.

  Parses every define("ds-…") and the attr()/hasAttribute() calls inside its render fn, so the
  component vocabulary is ALWAYS derived from the code and can't drift. This file is the model's
  "front door": read manifest.md to know what components exist before composing a screen.

  Usage:  node ds/build-manifest.mjs   (or: npm run manifest)
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "ds.js"), "utf8");

// each define("tag", …) and the source slice up to the next define()
const defs = [...src.matchAll(/define\(\s*["']([\w-]+)["']/g)];
const comps = [];
for (let i = 0; i < defs.length; i++) {
  const tag = defs[i][1];
  const body = src.slice(defs[i].index, i + 1 < defs.length ? defs[i + 1].index : src.length);
  const attrs = [], seen = new Set();
  for (const m of body.matchAll(/attr\(\s*(?:el|this)\s*,\s*["']([\w-]+)["']\s*(?:,\s*([^,)]*))?\)/g)) {
    if (seen.has(m[1])) continue; seen.add(m[1]);
    let def = (m[2] || "").trim().replace(/^["'`+]+|["'`+]+$/g, "");
    if (/[|(`]|\bel\b|\bthis\b|\.\w/.test(def)) def = ""; // drop JS expressions, keep plain literals
    attrs.push({ name: m[1], default: def });
  }
  const flags = [];
  for (const m of body.matchAll(/hasAttribute\(\s*["']([\w-]+)["']\s*\)/g)) if (!flags.includes(m[1])) flags.push(m[1]);
  comps.push({ tag, attrs, flags });
}

// example tag for the manifest line
function example(c) {
  const a = c.attrs.slice(0, 4).map((x) => `${x.name}="${x.default || ""}"`).join(" ");
  const f = c.flags.length ? " " + c.flags[0] : "";
  return `<${c.tag}${a ? " " + a : ""}${f}></${c.tag}>`;
}

// manifest.json (tooling) + manifest.md (front door)
fs.writeFileSync(path.join(here, "manifest.json"), JSON.stringify(comps, null, 2));
const md = [
  "# DS — component manifest",
  "",
  `${comps.length} components. Generated from \`ds/ds.js\` by \`build-manifest.mjs\` — do not edit by hand.`,
  "",
  "## Components",
  ...comps.map((c) => {
    const at = c.attrs.length ? "attrs: " + c.attrs.map((a) => a.name).join(", ") : "no attrs";
    const fl = c.flags.length ? " · flags: " + c.flags.join(", ") : "";
    return `- **\`${c.tag}\`** — ${at}${fl}\n  - \`${example(c)}\``;
  }),
  "",
].join("\n");
fs.writeFileSync(path.join(here, "manifest.md"), md);
console.log(`manifest: ${comps.length} components → ds/manifest.md, ds/manifest.json`);
