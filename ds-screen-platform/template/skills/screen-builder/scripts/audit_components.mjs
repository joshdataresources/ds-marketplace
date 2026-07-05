#!/usr/bin/env node
/**
 * audit_components.mjs — the no-fabrication gate.
 *
 * Verifies that every component a screen claims to use is a REAL coded component
 * in the library (a <ds-*> tag in ds/manifest.json). Catches fabricated or
 * misnamed elements deterministically, so a built screen can't silently drift.
 *
 * Each component entry in the screen's <name>.components.json should carry a
 * `tag` (e.g. "ds-card").
 *
 * Usage:
 *   npm run audit -- screens/<name>.components.json
 *
 * Exit 0 = every component resolves (or is an acknowledged gap). Exit 1 = fabricated/misnamed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("usage: audit_components.mjs <screen.components.json>");
  process.exit(2);
}

// Project root = three levels up from this script (skills/<skill>/scripts/).
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };

// Walk up from a start dir looking for a file (fallback locator).
function findUp(name, start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, name);
    if (exists(p)) return p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// ── library tags (the coded source of truth) ────────────────────────────────
const libPath = exists(path.join(root, "ds/manifest.json"))
  ? path.join(root, "ds/manifest.json")
  : findUp(path.join("ds", "manifest.json"), process.cwd());
if (!libPath) {
  console.error("✗ ds/manifest.json not found. Run: node ds/build-manifest.mjs");
  process.exit(2);
}
const lib = JSON.parse(fs.readFileSync(libPath, "utf8"));
// manifest.json is either a bare array of components or { meta, components }.
const libComponents = Array.isArray(lib) ? lib : lib.components || [];
const tagSet = new Set(libComponents.map((c) => c.tag));

// ── the screen's manifest ────────────────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const gapKeys = new Set(
  (manifest.gaps || []).map((g) =>
    (typeof g === "string" ? g : g.tag || g.name || "").trim().toLowerCase()
  )
);

const claimed = [];
for (const slot of manifest.slots || []) {
  for (const c of slot.components || []) claimed.push({ slot: slot.slot || "?", ...c });
}
if (claimed.length === 0) {
  console.error("✗ manifest lists no components under .slots[].components — nothing to audit.");
  process.exit(2);
}

const unmatched = [];
for (const c of claimed) {
  const byTag = c.tag && tagSet.has(c.tag.trim());
  const key = (c.tag || c.name || "").trim().toLowerCase();
  const isGap = key && gapKeys.has(key);
  if (!byTag && !isGap) unmatched.push(c);
}

const total = claimed.length;
const ok = total - unmatched.length;
console.log(`Audited ${total} component reference(s) in ${path.basename(manifestPath)}`);
console.log(`  library: ${libPath} (${tagSet.size} coded components)`);
console.log(`  resolved: ${ok}/${total}`);

if (unmatched.length) {
  console.log(`\n✗ ${unmatched.length} component(s) NOT in the library (fabricated or misnamed):`);
  for (const c of unmatched) {
    const label = c.tag || c.name || "(no tag/name)";
    console.log(`   - slot "${c.slot}": "${label}"`);
  }
  console.log(
    `\nFix each: correct the tag to a real one (see ds/manifest.md),` +
      ` build it into ds/ds.js (then re-run build-manifest), or move it to "gaps".`
  );
  process.exit(1);
}

console.log(`\n✓ PASS — every component resolves to a real library entry.`);
if (manifest.gaps && manifest.gaps.length) {
  console.log(`  (${manifest.gaps.length} acknowledged gap(s) — surface these to the user.)`);
}
process.exit(0);
