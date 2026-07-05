#!/usr/bin/env node
/*
  sync.mjs — refresh the plugin's bundled machine from ds-platform (the source of truth).

  Copies, into ds-screen-platform/:
    ../ds-platform/template/                     → template/
    ../ds-platform/scripts/bootstrap-client.mjs  → scripts/bootstrap-client.mjs
    ../ds-platform/template/skills/screen-builder→ skills/screen-builder  (plugin-level skill)

  Run after any change to ds-platform, before publishing the marketplace.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "ds-platform");
const dst = path.join(here, "ds-screen-platform");

if (!fs.existsSync(src)) {
  console.error("ds-platform not found at", src);
  process.exit(1);
}

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const e of fs.readdirSync(s, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const sp = path.join(s, e.name), dp = path.join(d, e.name);
    e.isDirectory() ? copyDir(sp, dp) : fs.copyFileSync(sp, dp);
  }
}

rmrf(path.join(dst, "template"));
copyDir(path.join(src, "template"), path.join(dst, "template"));

fs.mkdirSync(path.join(dst, "scripts"), { recursive: true });
fs.copyFileSync(
  path.join(src, "scripts", "bootstrap-client.mjs"),
  path.join(dst, "scripts", "bootstrap-client.mjs")
);

rmrf(path.join(dst, "skills", "screen-builder"));
copyDir(
  path.join(src, "template", "skills", "screen-builder"),
  path.join(dst, "skills", "screen-builder")
);

// The plugin-level skill runs in ANY client project, where the bootstrap has
// renamed ds-* to the client prefix (ds/acme-ds.js, <acme-button>). Inject a
// note so the skill still applies there and `ds-` reads as a placeholder.
const skillMd = path.join(dst, "skills", "screen-builder", "SKILL.md");
let md = fs.readFileSync(skillMd, "utf8");
const note =
  "\n> **Prefix note:** bootstrapped client projects rename the `ds-*` prefix — the library\n" +
  "> is `ds/<prefix>-ds.js` and tags are `<prefix>-*` (e.g. `<acme-button>`). Everywhere this\n" +
  "> document says `ds-`/`ds/ds.js`, substitute the project's actual prefix and library file;\n" +
  "> `ds/manifest.md` lists the real tags. The skill applies to any project with a `ds/*.js`\n" +
  "> library + generated `ds/manifest.md`.\n";
md = md.replace(/^(---\n[\s\S]*?\n---\n)/, `$1${note}`);
fs.writeFileSync(skillMd, md);

console.log("✓ plugin bundle synced from ds-platform");
