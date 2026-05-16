import React, {useEffect, useState} from "react";
import { getEchoBus } from "../echo/echoClient.js";

export default function EchoOverlay(){
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {role:"assistant", text:"I’m awake and listening — say what you need."}
  ]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const onOpen   = () => setOpen(true);
    const onToggle = () => setOpen(v=>!v);
    window.addEventListener("echo-open-overlay", onOpen);
    window.addEventListener("echo-toggle-overlay", onToggle);

    const bus = getEchoBus();
    const onAssistant = (e) => {
      const t = e.detail?.text; if (!t) return;
      setMessages(m => m.concat({role:"assistant", text:t}));
    };
    bus.addEventListener("assistant_text", onAssistant);

    return () => {
      window.removeEventListener("echo-open-overlay", onOpen);
      window.removeEventListener("echo-toggle-overlay", onToggle);
      bus.removeEventListener("assistant_text", onAssistant);
    };
  }, []);

  const send = () => {
    const text = input.trim(); if (!text) return;
    setMessages(m => m.concat({role:"user", text}));
    setInput("");
    window.echo?.sendText(text);
  };

  return (
    <div style={{position:"fixed", inset:0, pointerEvents:"none", zIndex:2000}}>
      {open && (
        <div style={{
          position:"absolute", right:16, bottom:16, width:380, height:520, pointerEvents:"auto",
          borderRadius:16, border:"1px solid rgba(22,224,255,.35)",
          background:"linear-gradient(180deg, rgba(10,16,28,.92), rgba(10,16,28,.86))",
          boxShadow:"0 25px 60px rgba(0,0,0,.55), 0 0 30px rgba(22,224,255,.18)", color:"#d7f6ff",
          display:"flex", flexDirection:"column", overflow:"hidden"
        }}>
          <div style={{display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
            borderBottom:"1px solid rgba(22,224,255,.25)"}}>
            <div style={{fontWeight:800}}>Echo</div>
            <div style={{opacity:.7, fontSize:12}}>Companion</div>
            <button title="Minimize" onClick={()=>setOpen(false)}
              style={{marginLeft:"auto", width:28, height:28, borderRadius:8,
                border:"1px solid rgba(22,224,255,.28)", background:"rgba(22,224,255,.08)",
                color:"#d7f6ff", cursor:"pointer"}}>—</button>
          </div>

          <div style={{flex:1, padding:12, overflowY:"auto"}}>
            {messages.map((m,i)=>(
              <div key={i} style={{
                margin:"8px 0", display:"flex",
                justifyContent: m.role==="user"?"flex-end":"flex-start"
              }}>
                <div style={{
                  maxWidth:"85%", padding:"8px 10px", borderRadius:10, lineHeight:1.35, fontSize:14,
                  background: m.role==="user" ? "rgba(22,224,255,.12)" : "rgba(255,255,255,.06)",
                  border:"1px solid rgba(255,255,255,.08)"
                }}>{m.text}</div>
              </div>
            ))}
          </div>

          <div style={{padding:10, display:"flex", gap:8, borderTop:"1px solid rgba(22,224,255,.25)"}}>
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") send(); }}
              placeholder="Talk to Echo…"
              style={{flex:1, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.14)",
                borderRadius:10, padding:"10px 12px", color:"inherit", outline:"none"}}
            />
            <button onClick={send} style={{
              padding:"8px 12px", borderRadius:10, border:"1px solid rgba(22,224,255,.35)",
              background:"rgba(22,224,255,.14)", color:"#d7f6ff", cursor:"pointer"
            }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
