#!/usr/bin/env node
/**
 * LUCCCA preview server.
 *
 * Static routing:
 *   /                 → /app/dist/spa/                  (integrated LUCCCA shell — primary)
 *   /standalone/*     → /app/frontend/dist-archive/     (standalone investor dashboard — preserved)
 *
 * Reverse-proxy routing (so the SPA can hit /api/* under the same origin):
 *   /api/*  + /ws/*   → proxied to API_PROXY_TARGET (FastAPI backend, default http://localhost:8001)
 *
 * iter266 — Single Python runtime. The dual-backend PROXY_RULES system
 * (Express :8080 fanout) was removed once D2/D3/D5 were ported to FastAPI.
 *
 * Both surfaces are SPAs: unknown paths fall back to that surface's index.html.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

// Minimal .env loader so operators can append API_PROXY_* vars to
// /app/frontend/.env without modifying the supervisor config (which is
// read-only). Lines that look like KEY=VAL are imported into process.env
// without overwriting anything already set.
function loadEnvFile(envPath) {
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env, fine */
  }
}
loadEnvFile(path.join(path.dirname(new URL(import.meta.url).pathname), ".env"));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const LUCCCA_ROOT = process.env.LUCCCA_ROOT || "/app/dist/spa";
const STANDALONE_ROOT = process.env.STANDALONE_ROOT || "/app/frontend/dist-archive";
// iter266 · Single-target API proxy. The dual-backend PROXY_RULES system
// (used to fan out /api/maestro → Express :8080) was removed once D2/D3/D5
// were ported to FastAPI. Everything now goes to one Python backend.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://localhost:8001";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function safeJoin(root, requested) {
  const resolved = path.resolve(root, "." + requested);
  if (!resolved.startsWith(path.resolve(root))) return null;
  return resolved;
}

function sendFile(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 — not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function tryServe(req, res, root, requestedPath, spaFallback) {
  const candidate = safeJoin(root, requestedPath);
  if (!candidate) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("403");
    return;
  }
  fs.stat(candidate, (err, stat) => {
    if (!err && stat.isFile()) {
      sendFile(req, res, candidate);
      return;
    }
    if (!err && stat.isDirectory()) {
      const idx = path.join(candidate, "index.html");
      fs.stat(idx, (err2, stat2) => {
        if (!err2 && stat2.isFile()) {
          sendFile(req, res, idx);
        } else if (spaFallback) {
          sendFile(req, res, spaFallback);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("404");
        }
      });
      return;
    }
    if (spaFallback) {
      sendFile(req, res, spaFallback);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404");
    }
  });
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/") ||
         pathname === "/ws" || pathname.startsWith("/ws/");
}

function proxyRequest(req, res) {
  const target = new URL(API_PROXY_TARGET);
  const opts = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (target.protocol === "https:" ? 443 : 80),
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: target.host },
  };
  const upstream = http.request(opts, (ur) => {
    res.writeHead(ur.statusCode || 502, ur.headers);
    ur.pipe(res);
  });
  upstream.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "proxy_upstream_failed", target: API_PROXY_TARGET, detail: String(err) }));
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || "/");
  const pathname = decodeURIComponent(parsed.pathname || "/");

  // 1) /api/* + /ws/* → reverse-proxy to FastAPI backend
  if (isApiPath(pathname)) {
    proxyRequest(req, res);
    return;
  }

  // 2) Standalone investor dashboard (preserved at /standalone)
  if (pathname === "/standalone" || pathname === "/standalone/") {
    sendFile(req, res, path.join(STANDALONE_ROOT, "index.html"));
    return;
  }
  if (pathname.startsWith("/standalone/")) {
    const rest = pathname.slice("/standalone".length);
    tryServe(req, res, STANDALONE_ROOT, rest, path.join(STANDALONE_ROOT, "index.html"));
    return;
  }

  // 3) Integrated LUCCCA shell (primary)
  tryServe(req, res, LUCCCA_ROOT, pathname, path.join(LUCCCA_ROOT, "index.html"));
});

// Websocket upgrade → backend
server.on("upgrade", (req, socket, head) => {
  const pathname = (req.url || "/").split("?")[0];
  if (!isApiPath(pathname)) {
    socket.destroy();
    return;
  }
  const upstream = new url.URL(API_PROXY_TARGET);
  const opts = {
    hostname: upstream.hostname,
    port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: upstream.host },
  };
  const proxyReq = http.request(opts);
  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    const head = [
      `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}`,
      ...Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`),
    ].join("\r\n") + "\r\n\r\n";
    socket.write(head);
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket).pipe(proxySocket);
  });
  proxyReq.on("error", () => socket.destroy());
  proxyReq.end();
});

server.listen(PORT, HOST, () => {
  console.log(`[luccca-preview] LUCCCA shell:    http://${HOST}:${PORT}/`);
  console.log(`[luccca-preview] Standalone:      http://${HOST}:${PORT}/standalone/`);
  console.log(`[luccca-preview] API proxy:       /api/* + /ws/* → ${API_PROXY_TARGET}`);
  console.log(`[luccca-preview] LUCCCA root:     ${LUCCCA_ROOT}`);
  console.log(`[luccca-preview] Standalone root: ${STANDALONE_ROOT}`);
});
