import React, { useState, useEffect, useCallback } from "react";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#3b82f6", accentDim: "rgba(59,130,246,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
type Tab = "channels" | "directory";

function ChannelsTab() {
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  useEffect(() => { fetch(`${API}/api/connect/channels`).then(r => r.json()).then(d => setChannels(d.channels || [])); }, []);
  const openChannel = (ch: any) => { setActiveChannel(ch); fetch(`${API}/api/connect/channels/${ch.id}/messages`).then(r => r.json()).then(d => setMessages(d.messages || [])); };
  const sendMessage = () => {
    if (!newMsg.trim() || !activeChannel) return;
    fetch(`${API}/api/connect/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel_id: activeChannel.id, sender_id: "current-user", sender_name: "You", content: newMsg, message_type: "text" }) })
      .then(r => r.json()).then(msg => { setMessages([...messages, msg]); setNewMsg(""); });
  };
  const typeColors: Record<string, string> = { department: C.accent, group: C.amber, shift: "#8b5cf6", property: C.green, direct: "#ec4899" };
  return (
    <div data-testid="connect-channels" style={{ display: "flex", height: "100%", gap: 0 }}>
      <div style={{ width: 260, minWidth: 260, borderRight: `1px solid ${C.border}`, overflowY: "auto" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 600, color: C.dim, textTransform: "uppercase" }}>Channels ({channels.length})</div>
        {channels.map(ch => (
          <button key={ch.id} onClick={() => openChannel(ch)} data-testid={`channel-${ch.id}`} style={{ width: "100%", display: "block", textAlign: "left", padding: "10px 14px", background: activeChannel?.id === ch.id ? C.accentDim : "transparent", border: "none", borderBottom: `1px solid ${C.border}20`, cursor: "pointer", transition: "all 0.15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: activeChannel?.id === ch.id ? C.accent : C.text }}>{ch.name}</span>
              <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 8, background: `${typeColors[ch.channel_type] || C.dim}15`, color: typeColors[ch.channel_type] || C.dim }}>{ch.channel_type}</span>
            </div>
            {ch.last_message && <div style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.last_sender}: {ch.last_message}</div>}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeChannel ? (
          <>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: "rgba(59,130,246,0.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{activeChannel.name}</div>
              <div style={{ fontSize: 10, color: C.dim }}>{activeChannel.description} | {activeChannel.message_count} messages</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {messages.map(m => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{m.sender_name}</span>
                    <span style={{ fontSize: 9, color: C.muted }}>{m.created_at?.slice(11, 16)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, paddingLeft: 2 }}>{m.content}</div>
                </div>
              ))}
              {messages.length === 0 && <div style={{ color: C.dim, fontSize: 12, textAlign: "center", padding: 40 }}>No messages yet</div>}
            </div>
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type a message..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} data-testid="connect-message-input" />
              <button onClick={sendMessage} data-testid="connect-send-btn" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Send</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.dim }}>Select a channel to start messaging</div>
        )}
      </div>
    </div>
  );
}

function DirectoryTab() {
  const [directory, setDirectory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => { const q = search ? `?search=${search}` : ""; fetch(`${API}/api/connect/directory${q}`).then(r => r.json()).then(d => setDirectory(d.directory || [])); }, [search]);
  return (
    <div data-testid="connect-directory">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or department..." style={{ width: "100%", maxWidth: 400, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, marginBottom: 16 }} data-testid="directory-search" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {directory.map(d => (
          <div key={d.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.accent }}>{d.display_name[0]}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{d.display_name}</div>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "capitalize" }}>{d.department}</div>
            </div>
          </div>
        ))}
        {directory.length === 0 && <div style={{ color: C.dim, fontSize: 12, padding: 20 }}>No staff found</div>}
      </div>
    </div>
  );
}

export default function EchoConnect() {
  const [tab, setTab] = useState<Tab>("channels");
  return (
    <div data-testid="echo-connect-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(59,130,246,0.04)" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Echo Connect</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setTab("channels")} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${tab === "channels" ? C.accent : "transparent"}`, background: tab === "channels" ? C.accentDim : "transparent", color: tab === "channels" ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Channels</button>
        <button onClick={() => setTab("directory")} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${tab === "directory" ? C.accent : "transparent"}`, background: tab === "directory" ? C.accentDim : "transparent", color: tab === "directory" ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Directory</button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "channels" && <ChannelsTab />}
        {tab === "directory" && <DirectoryTab />}
      </div>
    </div>
  );
}
