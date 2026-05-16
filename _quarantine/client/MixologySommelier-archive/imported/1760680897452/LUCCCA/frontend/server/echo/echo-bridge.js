// server/echo/echo-bridge.js
// WS presence + chokidar watcher + optional LLM proxy
// Env:
//   PORT=9091
//   ECHO_WATCH_GLOBS=frontend/src/**/*,frontend/public/**/*,modules/**/*
//   OPENAI_API_KEY=...            (optional; enables LLM proxy)
//   OPENAI_MODEL=gpt-4o-mini      (example; set your model)
//   OR set ECHO_LLM_PROXY_URL to hit your own HTTP agent instead.

import http from "http";
import express from "express";
import { WebSocketServer } from "ws";
import chokidar from "chokidar";
import crypto from "crypto";

const PORT = Number(process.env.PORT || 9091);
const WATCH = (process.env.ECHO_WATCH_GLOBS || "frontend/src/**/*,frontend/public/**/*,modules/**/*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get("/send", (req, res) => {
  // dev helper: GET /send?type=chat.user&text=hello
  const { type = "chat.user", ...rest } = req.query;
  const payload = { type, ...rest };
  broadcast(payload);
  res.json({ ok: true, sent: payload });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

function broadcast(obj) {
  const json = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(json);
  }
}
function send(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch {}
}

wss.on("connection", (ws) => {
  clients.add(ws);
  send(ws, { type: "hello", from: "bridge", version: "1" });
  send(ws, { type: "status", ws: "online" });

  ws.on("message", async (buf) => {
    let msg;
    try { msg = JSON.parse(String(buf)); } catch { return; }
    // Fan-out to everyone (Echo HUDs) so UI stays in sync
    broadcast({ ...msg, _relay: true });

    // Optional: proxy chat to an LLM
    if (msg.type === "chat.user" && (process.env.OPENAI_API_KEY || process.env.ECHO_LLM_PROXY_URL)) {
      const reply = await askLLM(String(msg.text || ""));
      if (reply) broadcast({ type: "chat.assistant", text: reply });
    }
    if (msg.type === "theme.change") {
      broadcast({ type: "theme.change", mode: msg.mode });
    }
  });

  ws.on("close", () => clients.delete(ws));
});

// File watcher → fs.change events
if (WATCH.length) {
  const watcher = chokidar.watch(WATCH, { ignoreInitial: true });
  const emit = (event, path) => {
    const ext = (path.split(".").pop() || "").toLowerCase();
    broadcast({ type: "fs.change", event, path, ext: ext ? "." + ext : "" });
  };
  watcher.on("add", (p) => emit("add", p));
  watcher.on("change", (p) => emit("change", p));
  watcher.on("unlink", (p) => emit("unlink", p));
}

// Optional LLM proxy (OpenAI or custom HTTP)
async function askLLM(userText) {
  try {
    if (process.env.ECHO_LLM_PROXY_URL) {
      const r = await fetch(process.env.ECHO_LLM_PROXY_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: userText }),
      });
      const j = await r.json();
      return j.reply || j.text || "";
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) return "";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are Echo, a resident agent for the LUCCCA app." },
          { role: "user", content: userText }
        ],
        temperature: 0.2,
      }),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim?.() || "";
  } catch (e) {
    console.warn("[echo-bridge] LLM proxy error:", e.message);
    return "";
  }
}

server.listen(PORT, () => {
  console.log(`✓ Echo bridge on ws://localhost:${PORT}  (GET /send, /health)`);
});
