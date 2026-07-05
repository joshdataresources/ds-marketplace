#!/usr/bin/env node
/*
  bootstrap-client.mjs — replicate the coded design-system machine for a new client.

  Copies template/ to a new project folder, renames the ds-* prefix, generates editor rules
  and screen-builder skill from the AlphaPoint reference, and prints next steps.

  Usage:
    node scripts/bootstrap-client.mjs --name acme --prefix acme
    node scripts/bootstrap-client.mjs --name acme --prefix acme --out examples/acme-mobile-ds
    node scripts/bootstrap-client.mjs   (interactive prompts)
*/
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const templateDir = path.join(repoRoot, "template");

const TEXT_EXT = new Set([
  ".html", ".js", ".mjs", ".md", ".mdc", ".json", ".txt", ".css",
]);

function parseArgs(argv) {
  const args = { name: "", prefix: "", out: "" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--name" && argv[i + 1]) args.name = argv[++i];
    else if (a === "--prefix" && argv[i + 1]) args.prefix = argv[++i];
    else if ((a === "--out" || a === "-o") && argv[i + 1]) args.out = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/bootstrap-client.mjs [--name NAME] [--prefix PREFIX] [--out PATH]

  --name     Client slug (e.g. acme) — used for folder + display name
  --prefix   Component prefix (e.g. acme → acme-button, --acme-brand)
  --out      Output directory (default: examples/<name>-mobile-ds)
`);
      process.exit(0);
    }
  }
  return args;
}

async function prompt(question, def = "") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(def ? `${question} [${def}]: ` : `${question}: `, resolve);
  });
  rl.close();
  const v = (answer || def).trim();
  return v;
}

function titleCase(slug) {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function displayName(name) {
  return titleCase(name) + " Mobile";
}

/** Rename ds-* prefix → <prefix>-* in file contents. Order matters. */
function applyPrefix(text, prefix, pkgName) {
  const p = prefix.toLowerCase();
  let s = text;
  s = s.replace(/ds-inline/g, `${p}-inline`);
  s = s.replace(/id="ds-css"/g, `id="${p}-css"`);
  s = s.replace(/ds\/ds\.js/g, `ds/${p}-ds.js`);
  s = s.replace(/path\.join\(here,\s*"ds\.js"\)/g, `path.join(here, "${p}-ds.js")`);
  s = s.replace(/readFileSync\(path\.join\(here,\s*"ds\.js"\)/g, `readFileSync(path.join(here, "${p}-ds.js")`);
  s = s.replace(/--ds-/g, `--${p}-`);
  s = s.replace(/\.ds-/g, `.${p}-`);
  s = s.replace(/define\(\s*["']ds-/g, `define("${p}-`);
  s = s.replace(/<\/ds-/g, `</${p}-`);
  s = s.replace(/<ds-/g, `<${p}-`);
  s = s.replace(/(["'])ds-/g, `$1${p}-`);
  // bare ds-* class names + custom-element selectors in CSS (ds-btn, ds-icon,ds-badge, …)
  s = s.replace(/\bds-([\w-]+)/g, `${p}-$1`);
  s = s.replace(/&lt;ds-\*&gt;/g, `&lt;${p}-*&gt;`);
  s = s.replace(/<ds-\*>/g, `<${p}-*>`);
  s = s.replace(/ds-starter/g, pkgName);
  s = s.replace(/name:\s*screen-builder\b/g, `name: ${p}-screen-builder`);
  s = s.replace(/skills\/screen-builder\b/g, `skills/${p}-screen-builder`);
  s = s.replace(/# DS — component manifest/g, `# ${titleCase(p)} — component manifest`);
  s = s.replace(/Generated from `ds\/ds\.js`/g, `Generated from \`ds/${p}-ds.js\``);
  return s;
}

/** Generate client rules from AlphaPoint reference rules. */
function fromAlphapoint(text, prefix, name) {
  const p = prefix.toLowerCase();
  const dn = displayName(name);
  return text
    .replace(/AlphaPoint Mobile/g, dn)
    .replace(/alphapoint-screen-builder/g, `${p}-screen-builder`)
    .replace(/alphapoint-ds\.js/g, `${p}-ds.js`)
    .replace(/--ap-/g, `--${p}-`)
    .replace(/<ap-/g, `<${p}-`)
    .replace(/ap-/g, `${p}-`)
    .replace(/define\("ap-/g, `define("${p}-`);
}

function copyDir(src, dest, skip = new Set()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

function walkFiles(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkFiles(p, fn);
    } else fn(p);
  }
}

function readIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  let { name, prefix, out } = parseArgs(process.argv);

  if (!name) name = await prompt("Client name (slug, e.g. acme)", "acme");
  if (!prefix) prefix = await prompt("Component prefix", name);
  if (!out) out = path.join("examples", `${name}-mobile-ds`);

  const p = prefix.toLowerCase();
  const pkgName = `${p}-mobile-ds`;
  const dn = displayName(name);
  const dest = path.isAbsolute(out) ? out : path.join(repoRoot, out);

  if (!fs.existsSync(templateDir)) {
    console.error("template/ not found at", templateDir);
    process.exit(1);
  }
  if (fs.existsSync(dest)) {
    console.error("Destination already exists:", dest);
    console.error("Remove it or pass a different --out path.");
    process.exit(1);
  }

  console.log(`\nBootstrapping ${dn}`);
  console.log(`  prefix: ${p}-* / --${p}-*`);
  console.log(`  output: ${dest}\n`);

  // 1. Copy template
  copyDir(templateDir, dest, new Set([".git"]));

  // 2. Rename ds/ds.js → ds/<prefix>-ds.js
  const dsSrc = path.join(dest, "ds", "ds.js");
  const dsDest = path.join(dest, "ds", `${p}-ds.js`);
  if (fs.existsSync(dsSrc)) {
    fs.renameSync(dsSrc, dsDest);
  }

  // 3. Rename skills/screen-builder → skills/<prefix>-screen-builder
  const skillSrc = path.join(dest, "skills", "screen-builder");
  const skillDest = path.join(dest, "skills", `${p}-screen-builder`);
  if (fs.existsSync(skillSrc)) {
    fs.renameSync(skillSrc, skillDest);
  }

  // 4. Apply prefix to all text files (incl. extensionless dotfiles like .cursorrules)
  const EXTENSIONLESS_TEXT = new Set([".cursorrules", ".gitignore", ".env.example"]);
  walkFiles(dest, (file) => {
    const ext = path.extname(file);
    if (!TEXT_EXT.has(ext) && !EXTENSIONLESS_TEXT.has(path.basename(file))) return;
    const raw = fs.readFileSync(file, "utf8");
    const next = applyPrefix(raw, p, pkgName);
    if (next !== raw) fs.writeFileSync(file, next);
  });

  // 5. Generate .cursor/rules from AlphaPoint reference
  const cursorDir = path.join(dest, ".cursor", "rules");
  fs.mkdirSync(cursorDir, { recursive: true });

  const apRule = readIfExists(path.join(repoRoot, ".cursor", "rules", "alphapoint.mdc"));
  const sbRule = readIfExists(path.join(repoRoot, ".cursor", "rules", "screen-builder.mdc"));
  if (apRule) {
    fs.writeFileSync(path.join(cursorDir, `${p}.mdc`), fromAlphapoint(apRule, p, name));
  }
  if (sbRule) {
    let sb = fromAlphapoint(sbRule, p, name);
    sb = sb.replace(/ds\/alphapoint-ds\.js/g, `ds/${p}-ds.js`);
    fs.writeFileSync(path.join(cursorDir, "screen-builder.mdc"), sb);
  }

  // 6. Copy .cursor/mcp.json
  const mcpSrc = readIfExists(path.join(repoRoot, ".cursor", "mcp.json"));
  if (mcpSrc) {
    fs.mkdirSync(path.join(dest, ".cursor"), { recursive: true });
    fs.writeFileSync(path.join(dest, ".cursor", "mcp.json"), mcpSrc);
  }

  // 7. Enrich the skill from alphapoint-screen-builder ONLY if the template's own
  // skill is a thin stub (no bundled audit script). The template ships the rich
  // generic skill since 2026-07, so this is a legacy fallback.
  const templateSkillIsRich = fs.existsSync(
    path.join(dest, "skills", `${p}-screen-builder`, "scripts", "audit_components.mjs")
  );
  const apSkill = templateSkillIsRich
    ? null
    : readIfExists(path.join(repoRoot, "skills", "alphapoint-screen-builder", "SKILL.md"));
  if (apSkill) {
    const skillDir = path.join(dest, "skills", `${p}-screen-builder`);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), fromAlphapoint(apSkill, p, name));

    // Copy audit script + references with prefix applied
    for (const rel of ["scripts/audit_components.mjs", "references/component-library.md", "references/layout-rules.md"]) {
      const src = path.join(repoRoot, "skills", "alphapoint-screen-builder", rel);
      if (!fs.existsSync(src)) continue;
      const outPath = path.join(skillDir, rel);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const raw = fs.readFileSync(src, "utf8");
      fs.writeFileSync(outPath, fromAlphapoint(raw, p, name));
    }
  }

  // 8. Generate CLAUDE.md stub
  const claudeStub = `# ${dn}

A modular mobile app. This repo is a **coded design system + screen builder**: screens are composed
from real \`<${p}-*>\` web components, not hand-rolled markup.

## Process
- **\`PROCESS.md\`** — the whole pipeline as a diagram (extract → coded DS → manifest → screens →
  verify/fidelity → re-skin). Start here for the big picture.
- **\`RUN.md\`** — everyday local commands. **\`agents/FIDELITY.md\`** — per-component fidelity gate.

## Source of truth
- **\`ds/${p}-ds.js\`** — the component library (framework-free \`<${p}-*>\` web components).
- **\`ds/manifest.md\`** — compact index (tag · attributes · example). Regenerate with \`npm run manifest\`.
- **\`component-gallery.html\`** — live gallery of every component + tokens.
- **\`layouts.json\`** — screen layout archetypes.

## Building screens
When the user describes a screen, the **\`${p}-screen-builder\`** skill runs: read \`ds/manifest.md\`,
pick an archetype from \`layouts.json\`, study the closest screen in \`screens/\`, and compose
\`<${p}-*>\` elements with live data. If a component is missing, add it to \`ds/${p}-ds.js\`
(never inline it into a screen) and regenerate the manifest.

## Don't
- Don't read \`pipeline/components.json\` / \`pipeline/design-system.json\` while building screens.
- Don't embed base64 image renders — compose the coded components instead.
- All colors via \`--${p}-*\` tokens.

## Figma
Set your Figma \`fileKey\` in \`agents/fidelity.json\` and \`layouts.json\` → \`meta.figmaFileKey\`.
Pull tokens with the Figma MCP \`get_variable_defs\` on a representative frame, then update the
\`:root\` block in \`ds/${p}-ds.js\`. See the root repo's \`REPLICATE.md\` for the full kickoff checklist.
`;
  fs.writeFileSync(path.join(dest, "CLAUDE.md"), claudeStub);

  // 9. Generate .cursorrules
  const cursorrules = readIfExists(path.join(repoRoot, ".cursorrules"));
  if (cursorrules) {
    fs.writeFileSync(path.join(dest, ".cursorrules"), fromAlphapoint(cursorrules, p, name));
  }

  // 10. Add audit script to package.json if skill was copied
  const pkgPath = path.join(dest, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = pkgName;
  if (fs.existsSync(path.join(dest, "skills", `${p}-screen-builder`, "scripts", "audit_components.mjs"))) {
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.audit = `node skills/${p}-screen-builder/scripts/audit_components.mjs`;
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // 11. Customize layouts.json meta
  const layoutsPath = path.join(dest, "layouts.json");
  if (fs.existsSync(layoutsPath)) {
    const layouts = JSON.parse(fs.readFileSync(layoutsPath, "utf8"));
    layouts.meta = layouts.meta || {};
    layouts.meta.app = `${dn} — modular white-label mobile app`;
    layouts.meta.figmaFileKey = "<YOUR_FIGMA_FILE_KEY>";
    if (layouts.meta.referenceBoard) {
      layouts.meta.referenceBoard.fileKey = "<YOUR_FIGMA_FILE_KEY>";
    }
    fs.writeFileSync(layoutsPath, JSON.stringify(layouts, null, 2) + "\n");
  }

  // 12. Update fidelity.json fileKey
  const fidelityPath = path.join(dest, "agents", "fidelity.json");
  if (fs.existsSync(fidelityPath)) {
    const fidelity = JSON.parse(fs.readFileSync(fidelityPath, "utf8"));
    fidelity.fileKey = "<YOUR_FIGMA_FILE_KEY>";
    fs.writeFileSync(fidelityPath, JSON.stringify(fidelity, null, 2) + "\n");
  }

  // 13. Run manifest + build
  const { execSync } = await import("node:child_process");
  try {
    execSync("npm run manifest && npm run build", { cwd: dest, stdio: "inherit" });
  } catch (e) {
    console.warn("\nWarning: manifest/build failed — run manually in the output folder.");
  }

  // Next steps
  console.log(`
✓ Bootstrapped ${dn} → ${path.relative(repoRoot, dest)}

Next steps:
  1. cd ${path.relative(repoRoot, dest)}
  2. Set Figma fileKey in agents/fidelity.json and layouts.json → meta.figmaFileKey
  3. Pull tokens: Figma MCP get_variable_defs on a frame → update :root in ds/${p}-ds.js
  4. npm run serve   → http://localhost:8128 (gallery + screens/)
  5. npm run verify  → manifest + build + lint gate
  6. Build components: add define("${p}-…") blocks to ds/${p}-ds.js, npm run manifest
  7. Compose screens from layouts.json archetypes + ds/manifest.md

Replicate another client:
  node scripts/bootstrap-client.mjs --name <client> --prefix <prefix>
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
