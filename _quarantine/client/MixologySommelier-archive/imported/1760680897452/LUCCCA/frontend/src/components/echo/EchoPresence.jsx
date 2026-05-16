// src/echo/EchoPresence.jsx
import React, { useEffect, useState } from "react";
import { getEchoBus } from "./echoClient.js";

export default function EchoPresence() {
  const [status, setStatus] = useState("connecting"); // online|local|connecting|offline
  const [note, setNote] = useState(null);

  useEffect(() => {
    const bus = getEchoBus();
    const onStatus = (e) => setStatus(e.detail?.status || "connecting");
    const onAssistant = (e) => {
      const text = e.detail?.text; if (!text) return;
      setNote(text); setTimeout(()=>setNote(null), 3500);
    };
    bus.addEventListener("status", onStatus);
    bus.addEventListener("assistant_text", onAssistant);
    return () => { bus.removeEventListener("status", onStatus); bus.removeEventListener("assistant_text", onAssistant); };
  }, []);

  const glow =
    status === "online" ? "rgba(16,196,100,.45)" :
    status === "local"  ? "rgba(22,224,255,.45)" :
    status === "connecting" ? "rgba(246,173,85,.5)" :
    "rgba(255,86,86,.5)";

  return (
    <div style={{ position:"fixed", top:14, right:18, zIndex:1300, pointerEvents:"none" }}>
      <div style={{
        width:38, height:38, borderRadius:999, pointerEvents:"auto", cursor:"pointer",
        background:"radial-gradient(60% 60% at 50% 45%, rgba(140, 0, 255, .75), rgba(0, 200, 255, .35) 60%, rgba(0,0,0,.0) 100%)",
        boxShadow:`0 0 20px ${glow}, 0 0 60px ${glow}`,
        border:"1px solid rgba(255,255,255,.08)"
      }}
      title={`Echo • ${status}`} onClick={()=>{
        const q = prompt("Ask Echo…"); if (q) window.echo?.sendText(q);
      }} />
      {note && (
        <div style={{
          marginTop:8, maxWidth:260, padding:"8px 10px", fontSize:13, color:"#d7f6ff",
          background:"rgba(9, 76, 209, 0.75)", border:"1px solid rgba(12, 243, 16, 0.25)",
          borderRadius:10, boxShadow:"0 10px 34px rgba(0,0,0,.35)"
        }}>{note}</div>
      )}
    </div>
  );
}
