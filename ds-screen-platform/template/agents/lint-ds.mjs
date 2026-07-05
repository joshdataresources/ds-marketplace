/*
  lint-ds.mjs — design-system drift linter for screens.

  Deterministic, no network. Catches the main way a screen drifts from the DS: a hardcoded hex
  color that EQUALS a --ds-* token (so a white-label re-skin would miss it). The token palette is
  parsed from the DS :root block, so this rule works on any project with zero edits. The inlined
  ds.js block is blanked before linting (its token definitions aren't drift).

  Usage:
    node agents/lint-ds.mjs            # lint screens/*.html
    node agents/lint-ds.mjs --fix      # auto-swap token-equal hex → var(--ds-*)
    node agents/lint-ds.mjs foo.html   # lint specific file(s)
  Exit 0 = no errors · 1 = one or more ERROR findings.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// token palette: hex → var name (parsed from the DS :root block)
const ds = fs.readFileSync(path.join(root, "ds/ds.js"), "utf8");
const rootBlock = (ds.match(/:root\{([\s\S]*?)\}/) || [, ""])[1];
const norm = (h) => { h = h.toLowerCase().replace(/^#/, ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return "#" + h; };
const hexToken = {};
for (const m of rootBlock.matchAll(/(--ds-[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)) { const h = norm(m[2]); if (!hexToken[h]) hexToken[h] = m[1]; }
const SKIP = new Set(["#ffffff", "#000000"]); // too common to be drift on their own

function lint(file) {
  const raw = fs.readFileSync(file, "utf8");
  const srcText = raw.replace(/<script id="ds-inline">[\s\S]*?<\/script>/, (m) => "\n".repeat((m.match(/\n/g) || []).length));
  const lines = srcText.split("\n");
  const warns = [], seen = new Set();
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const h = norm(m[0].slice(0, 7));
      if (hexToken[h] && !SKIP.has(h) && !seen.has(h)) { seen.add(h); warns.push({ ln: i + 1, msg: `${m[0]} — use var(${hexToken[h]})` }); }
    }
  });
  return { errors: [], warns };
}

function applyFix(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/<script id="ds-inline">[\s\S]*?<\/script>/);
  if (!m) return { skipped: true, fixed: 0 };
  const block = m[0], pre = raw.slice(0, m.index), post = raw.slice(m.index + block.length);
  let fixed = 0;
  const repl = (s) => s.replace(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (hx) => {
    const h = norm(hx);
    if (hexToken[h] && !SKIP.has(h)) { fixed++; return `var(${hexToken[h]})`; }
    return hx;
  });
  const out = repl(pre) + block + repl(post);
  if (fixed) fs.writeFileSync(file, out);
  return { fixed };
}

const FIX = process.argv.includes("--fix") || process.argv.includes("-f");
const ALL = process.argv.includes("--all");
const argvFiles = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const explicit = argvFiles.length > 0;
let files = explicit ? argvFiles : fs.readdirSync(path.join(root, "screens")).filter((f) => f.endsWith(".html") && f !== "index.html").map((f) => path.join(root, "screens", f));

const legacy = [];
if (!explicit) {
  files = files.filter((f) => {
    const s = fs.readFileSync(f, "utf8");
    if (/id="ds-inline"/.test(s) || /<ds-[a-z]/.test(s)) return true;
    legacy.push(path.relative(root, f)); return ALL;
  });
}

let totalE = 0, totalW = 0, totalFixed = 0; const skipped = [];
for (const f of files) {
  if (FIX) { const r = applyFix(f); if (r.skipped) skipped.push(path.relative(root, f)); else totalFixed += r.fixed; }
  const { errors, warns } = lint(f);
  totalE += errors.length; totalW += warns.length;
  if (!errors.length && !warns.length) continue;
  console.log(`\n${path.relative(root, f)}  —  ${errors.length} error(s), ${warns.length} warning(s)`);
  for (const e of errors) console.log(`  ✗ L${e.ln}: ${e.msg}`);
  for (const w of warns) console.log(`  · L${w.ln}: ${w.msg}`);
}
if (FIX) console.log(`\n${"-".repeat(60)}\nfixed ${totalFixed} hardcoded color(s) → tokens.${skipped.length ? `\nskipped ${skipped.length} legacy screen(s).` : ""}`);
console.log(`\n${"-".repeat(60)}\n${files.length} DS screen(s) · ${totalE} error(s) · ${totalW} warning(s)`);
if (legacy.length) console.log(`${legacy.length} legacy non-DS screen(s) not linted (use --all): ${legacy.join(", ")}`);
process.exit(totalE ? 1 : 0);
