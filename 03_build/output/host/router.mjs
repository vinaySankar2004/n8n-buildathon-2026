#!/usr/bin/env node
// One public address for the whole backend. ngrok's free plan gives a single fixed domain, so this
// router sits behind it: render paths go to the render service, everything else goes to n8n
// (editor, REST, public API, webhooks), including WebSocket upgrades for the editor's live updates.
import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.ROUTER_PORT || 8080);
const RENDER = { host: "127.0.0.1", port: Number(process.env.RENDER_PORT || 8787) };
const N8N = { host: "127.0.0.1", port: Number(process.env.N8N_PORT || 5678) };

const target = (url) => (/^\/(render|files|health)(\/|$|\?)/.test(url) ? RENDER : N8N);

const server = http.createServer((req, res) => {
  const to = target(req.url);
  const upstream = http.request(
    { ...to, method: req.method, path: req.url, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end(to === N8N ? "n8n is not running on the host laptop." : "The render service is not running on the host laptop.");
  });
  req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
  const to = target(req.url);
  const upstream = net.connect(to.port, to.host, () => {
    const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n");
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, "127.0.0.1", () => console.log(`Router on http://127.0.0.1:${PORT}: render paths to ${RENDER.port}, the rest to n8n on ${N8N.port}`));
