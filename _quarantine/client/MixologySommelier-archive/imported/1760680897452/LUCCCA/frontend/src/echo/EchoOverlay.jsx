import React, { useEffect, useState } from "react";
import { installEchoHook, getEchoBus } from "./echoClient.js";

export default function EchoOverlay() {
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_ECHO_WS_URL || `ws://${location.hostname}:9091`;
    installEchoHook({ baseUrl: wsUrl }); // idempotent
    const bus = getEchoBus();
    const onStatus = (e) => setStatus(e.detail?.status || "connecting");
    bus.addEventListener("status", onStatus);
    return () => bus.removeEventListener("status", onStatus);
  }, []);

  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 1500 }}>
      <AnimatedOrb
        status={status}
        onClick={() => {
          const q = window.prompt("Ask Echo a quick question:");
          if (!q) return;
          window.echo?.sendText(q);
          window.dispatchEvent(new CustomEvent("echo-notify", {
            detail: { text: `Thinking: ${q}`, tone: "info", ms: 1800 }
          }));
        }}
      />
    </div>
  );
}

function AnimatedOrb({ status, onClick }) {
  const color =
    status === "online" ? "#10c464" :
    status === "local" ?  "#16e0ff" :
    status === "connecting" ? "#f6ad55" : "#ff5656";

  return (
    <>
      <button onClick={onClick} title={`Ask Echo (${status})`} style={{ all: "unset", cursor: "pointer" }}>
        <div className="echo-orb">
          <span className="orb-glow" />
          <span className="orb-wave" />
        </div>
      </button>

      <style>{`
        .echo-orb {
          width: 46px; height: 46px; border-radius: 9999px;
          position: relative;
          background: radial-gradient(circle at 35% 30%, ${color}, rgba(255,255,255,.2) 35%, rgba(10,16,28,.85) 70%);
          box-shadow:
            0 0 28px ${color}66,
            inset 0 0 28px ${color}33,
            0 12px 28px rgba(0,0,0,.45);
          animation: orbPulse 2600ms ease-in-out infinite;
        }
        .echo-orb::after {
          content: "";
          position: absolute; inset: -12px;
          border-radius: inherit;
          background: radial-gradient(circle, ${color}55, transparent 60%);
          filter: blur(10px);
          animation: orbGlow 2600ms ease-in-out infinite;
          pointer-events: none;
        }
        .echo-orb .orb-glow {
          position: absolute; inset: -18px; border-radius: inherit;
          background: radial-gradient(circle at 50% 50%, ${color}33, transparent 65%);
          filter: blur(14px); opacity: .7;
          pointer-events: none;
        }
        .echo-orb .orb-wave {
          position: absolute; inset: -20px; border-radius: inherit;
          border: 1px solid ${color}66; opacity: .7;
          mask: conic-gradient(from 0deg, #0000 0 40%, #000 40% 60%, #0000 60% 100%);
          animation: orbit 8s linear infinite;
          pointer-events: none;
        }
        @keyframes orbPulse { 0%,100% { transform: scale(1)} 50% { transform: scale(1.06)} }
        @keyframes orbGlow { 0%,100% { opacity:.45 } 50% { opacity:.9 } }
        @keyframes orbit { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
