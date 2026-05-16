// server/echo/cortex/echo-cortex.js
import WebSocket from "ws";
import http from "http";
import Database from "better-sqlite3";

// --- storage ---------------------------------------------------------------
const db = new Database("echo_cortex.db");
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY, name TEXT, role TEXT, autonomy INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS events(
  ts INTEGER, userId TEXT, type TEXT, payload TEXT
);
CREATE TABLE IF NOT EXISTS prefs(
  userId TEXT, key TEXT, value TEXT, PRIMARY KEY (userId,key)
);
CREATE TABLE IF NOT EXISTS reflections(
  ts INTEGER, userId TEXT, action TEXT, success INTEGER, notes TEXT
);
`);

function now(){ return Date.now(); }
function putEvent(e){ db.prepare(`INSERT INTO events VALUES (?,?,?,?)`)
  .run(e.ts||now(), e.userId||"anon", e.type, JSON.stringify(e.payload||{})); }

// --- skills ---------------------------------------------------------------
const skills = {
  open_panel: {
    guard: "low",
    exec: (wsClient, { id, opts }) => {
      wsClient.send(JSON.stringify({ type:"assistant.intent", action:{ openPanel:id, opts } }));
      return `Opening ${id}`;
    }
  },
  board_cmd: {
    guard: "low",
    exec: (wsClient, { cmd }) => {
      wsClient.send(JSON.stringify({ type:"assistant.intent", action:{ boardCmd:cmd } }));
      return `Board command: ${cmd}`;
    }
  },
  set_theme: {
    guard: "low",
    exec: (wsClient, { mode }) => {
      wsClient.send(JSON.stringify({ type:"theme.change", mode }));
      return `Theme → ${mode}`;
    }
  },
};

// --- simple predictor (heuristic + recency) -------------------------------
function predictNext(userId) {
  // very first cut: last 100 events -> top panels
  const rows = db.prepare(`
    SELECT json_extract(payload,'$.id') AS id, COUNT(*) c
    FROM events WHERE userId=? AND type='ui.panel.opened'
    GROUP BY id ORDER BY c DESC LIMIT 5
  `).all(userId);
  const top = rows.map(r=>r.id).filter(Boolean);
  // Always include "whiteboard" + user’s role-specific panel
  return Array.from(new Set(["whiteboard", ...top]));
}

// --- WS bridge client ------------------------------------------------------
const UI_WSS = new WebSocket.Server({ noServer: true });
const clients = new Set();

function handleIncomingFromUI(ws) {
  clients.add(ws);
  ws.on("close", ()=>clients.delete(ws));
  ws.on("message", raw => {
    let msg; try{ msg=JSON.parse(raw); }catch{ return; }
    // persist events we care about
    if (msg.type?.startsWith("ui.") || msg.type?.startsWith("chat.") || msg.type==="theme.change") {
      putEvent({ type: msg.type, payload: msg, userId: msg.userId||"anon" });
    }

    // zero-shot “anticipate” pings
    if (msg.type === "chat.user") {
      const next = predictNext(msg.userId || "anon");
      ws.send(JSON.stringify({ type:"assistant_text", text:`Likely next: ${next.join(", ")}.` }));
      // if obvious intent, act
      const t = msg.text.toLowerCase();
      if (t.includes("open ") || t.includes("go to ")) {
        const id = t.includes("pastry") ? "pastry" :
                   t.includes("mixology") ? "mixology" :
                   t.includes("schedule") ? "scheduling" :
                   t.includes("whiteboard") || t.includes("dashboard") ? "whiteboard" : null;
        if (id) skills.open_panel.exec(ws, { id });
      }
    }
  });
}

// --- HTTP server (upgrades to WS) -----------------------------------------
const server = http.createServer((req,res)=>{
  if (req.url==="/predict" && req.method==="GET") {
    const userId = (new URL(req.url,"http://x")).searchParams.get("userId") || "anon";
    const preds = predictNext(userId);
    res.writeHead(200, {"content-type":"application/json"});
    res.end(JSON.stringify({ preds }));
  } else {
    res.writeHead(200); res.end("Echo Cortex OK");
  }
});

server.on("upgrade", (req, socket, head) => {
  UI_WSS.handleUpgrade(req, socket, head, (ws) => {
    handleIncomingFromUI(ws);
  });
});

server.listen(9092, () => console.log("Echo Cortex on ws://localhost:9092  (HTTP on :9092)"));
