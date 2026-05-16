// server/echo/server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 9091;
const clients = new Set();

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1) {
      try { ws.send(data); } catch (_) {}
    }
  }
}

wss.on("connection", (ws) => {
  clients.add(ws);
  try { ws.send(JSON.stringify({ type: "status", status: "online" })); } catch {}
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    // Relay assistant text for quick UI feedback
    if (msg.type === "chat.user" && msg.text) {
      broadcast({ type: "assistant_text", text: `You said: ${msg.text}` });
    }

    // Optional: forward theme changes
    if (msg.type === "theme.change" && msg.mode) {
      broadcast({ type: "theme.change", mode: msg.mode });
    }
  });
  ws.on("close",  () => clients.delete(ws));
  ws.on("error",  () => clients.delete(ws));
});

// Simple health + send endpoints
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/send",  (req, res) => {
  const { type = "assistant_text", text = "" } = req.query;
  broadcast({ type, text });
  res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`✓ Echo (offline) on http://localhost:${PORT}  — WS ready`);
});
