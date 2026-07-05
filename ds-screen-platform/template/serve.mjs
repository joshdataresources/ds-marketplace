// Minimal static file server for previewing the gallery + screens.
// Root "/" serves component-gallery.html; "/screens/" serves screens/index.html.
//   node serve.mjs   (or via .claude/launch.json → preview_start "gallery")
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 8128;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/component-gallery.html";
  else if (p.endsWith("/")) p += "index.html"; // /screens/ -> /screens/index.html
  const fp = path.join(root, p);
  if (!fp.startsWith(root) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("404 Not Found: " + p);
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
}).listen(port, () => console.log(`gallery → http://localhost:${port}/  ·  screens → http://localhost:${port}/screens/`));
