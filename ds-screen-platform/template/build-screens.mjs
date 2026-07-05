/*
  build-screens.mjs — make every screen AND the component gallery self-contained.

  Inlines ds/ds.js into each screens/*.html and into component-gallery.html so the pages render
  anywhere (preview, double-click, file://) with no external script. Any "</script" inside the DS
  is escaped so it can't close the inline block early. Also generates screens/index.html (a
  click-through list of every screen). Idempotent — re-run after editing the DS.

  Usage:  node build-screens.mjs   (or: npm run build)
*/
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dsRaw = fs.readFileSync(path.join(root, "ds/ds.js"), "utf8");
const dsSafe = dsRaw.replace(/<\/script/gi, "<\\/script");
const block = '<script id="ds-inline">\n' + dsSafe + "\n</script>";

// replace an existing inline block, or the first <script src=".../ds/ds.js">, with the fresh block
function inline(html) {
  if (/<script id="ds-inline">[\s\S]*?<\/script>/.test(html)) {
    return html.replace(/<script id="ds-inline">[\s\S]*?<\/script>/, block);
  }
  const m = html.match(/<script src="(?:\.\.\/)?ds\/ds\.js"><\/script>/);
  return m ? html.replace(m[0], block) : null;
}

let n = 0;
function build(file) {
  const out = inline(fs.readFileSync(file, "utf8"));
  if (out == null) return;
  fs.writeFileSync(file, out);
  console.log("built", path.relative(root, file));
  n++;
}

const dir = path.join(root, "screens");
const screenFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".html") && f !== "index.html").sort();
for (const f of screenFiles) build(path.join(dir, f));
build(path.join(root, "component-gallery.html"));

// generate screens/index.html — a click-through list of every screen
const links = screenFiles.map((f) => {
  const html = fs.readFileSync(path.join(dir, f), "utf8");
  const title = ((html.match(/<title>([^<]*)<\/title>/) || [, ""])[1].trim()) || f.replace(/\.html$/, "");
  return `      <a class="s" href="${f}"><span class="n">${title}</span><span class="f">${f}</span></a>`;
}).join("\n");
const indexHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Screens</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#0d0d0d;color:#e8e8e8;padding:28px 34px}h1{font-size:20px}.sub{color:#7d8597;font-size:13px;margin:5px 0 22px}.sub a{color:#3d63ff;text-decoration:none}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.s{display:flex;flex-direction:column;gap:3px;padding:14px 16px;background:#16181f;border:1px solid #23262e;border-radius:12px;text-decoration:none;color:#e8e8e8;transition:border-color .12s,background .12s}.s:hover{border-color:#3d63ff;background:#1b1d22}.n{font-size:14px;font-weight:600}.f{font-size:11px;color:#7d8597}</style></head>
<body><h1>Screens</h1><div class="sub">${screenFiles.length} screens · <a href="../component-gallery.html">component gallery →</a></div>
  <div class="grid">
${links}
  </div></body></html>`;
fs.writeFileSync(path.join(dir, "index.html"), indexHtml);
console.log("built screens/index.html (" + screenFiles.length + " screens)");
console.log(n + " file(s) updated.");
