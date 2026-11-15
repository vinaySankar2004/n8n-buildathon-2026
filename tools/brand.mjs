#!/usr/bin/env node
// Renders the NewsReels logo images. Run it, then open http://localhost:4399/render.html in any
// browser: the page draws each image with the real fonts and posts it back, and this saves it into
// 05_submit/output/brand/. Stops by itself once every image is saved.
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../05_submit/output/brand");
const EXPECTED = 7;
let saved = 0;

// The angular R on its own, as a plain path with no fonts, for icons.
writeFileSync(path.join(dir, "mark.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-36 -16 160 152"><rect x="-36" y="-16" width="160" height="152" rx="28" fill="#141414"/><path fill="#D7263D" fill-rule="evenodd" d="M0 0H62L84 22V46L66 64L88 120H62L43 68H24V120H0Z M24 22V46H54L60 40V28L54 22Z"/></svg>\n`);

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/render.html") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(readFileSync(path.join(dir, "render.html")));
  }
  if (req.method === "POST" && url.pathname === "/save") {
    const name = url.searchParams.get("name") || "";
    if (!/^[a-z0-9-]+\.png$/.test(name)) return res.writeHead(400).end();
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      writeFileSync(path.join(dir, name), Buffer.concat(chunks));
      console.log(`saved ${name}`);
      res.writeHead(204).end();
      if (++saved >= EXPECTED) setTimeout(() => process.exit(0), 200);
    });
    return;
  }
  res.writeHead(404).end();
});
server.listen(4399, "127.0.0.1", () => console.log("Open http://localhost:4399/render.html"));
