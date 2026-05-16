import React from "react";
import { getEchoBus } from "@core/echo/echoClient";

export default function EchoMini() {
  const [status, setStatus] = React.useState<"online"|"local"|"connecting"|"offline">("connecting");
  React.useEffect(() => {
    const bus = getEchoBus();
    const h = (e: any) => setStatus(e.detail?.status ?? "connecting");
    bus.addEventListener("status", h);
    return () => bus.removeEventListener("status", h);
  }, []);
  const color =
    status === "online" ? "#10c464" :
    status === "local"  ? "#f6ad55" :
    status === "offline"? "#ff5656" : "#49c8ff";
  return (
    <div style={{
      position:"fixed", top:10, right:10, zIndex: 9999,
      display:"flex", alignItems:"center", gap:8,
      border:"1px solid rgba(22,224,255,.35)", borderRadius:10,
      padding:"6px 10px", background:"rgba(10,16,28,.75)", color:"#d7f6ff",
      backdropFilter:"blur(8px)"
    }}>
      <span style={{display:"inline-block", width:10, height:10, borderRadius:999, background:color}} />
      <span>Echo • {status === "online" ? "Online" : status === "local" ? "Local (no server)" : status}</span>
    </div>
  );
}
