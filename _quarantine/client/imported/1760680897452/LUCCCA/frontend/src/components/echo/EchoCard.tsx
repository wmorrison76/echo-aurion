import React from "react";

export default function EchoCard({ status = "offline" }: { status?: "online"|"local"|"connecting"|"offline" }) {
  const dot =
    status === "online" ? "#10c464" :
    status === "local"  ? "#f6ad55" :
    status === "connecting" ? "#56b4ff" : "#ff5656";

  return (
    <div style={{
      minWidth: 360, maxWidth: 520, padding: 12, borderRadius: 14,
      background: "rgba(10,16,28,.8)", color: "#d7f6ff",
      border: "1px solid rgba(22,224,255,.28)",
      boxShadow: "0 10px 22px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.05)"
    }}>
      <div style={{display:"flex", alignItems:"center", gap:10, fontWeight:700}}>
        <span style={{
          width:10, height:10, borderRadius:999, background:dot,
          boxShadow:`0 0 14px ${dot}90, inset 0 0 0 1px #ffffff12`
        }}/>
        Echo • {status[0].toUpperCase()+status.slice(1)}
      </div>
      <div style={{opacity:.8, marginTop:6, fontSize:14}}>
        I’m awake and listening — say what you need.
      </div>
    </div>
  );
}
