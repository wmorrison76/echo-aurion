// Minimal, “alive” orb you can style later.
import React, { useMemo } from "react";

export function AnimatedOrb({ status = "connecting", onClick, visible = true }) {
  const glow = useMemo(() => {
    if (status === "online") return "rgba(16,196,100,.35)";
    if (status === "local")  return "rgba(246,173,85,.28)";
    return "rgba(255,86,86,.30)";
  }, [status]);

  return (
    <div
      role="button"
      aria-label="Echo"
      onClick={onClick}
      style={{
        position: "fixed", top: 12, right: 14, width: 36, height: 36,
        borderRadius: 999,
        background:
          "radial-gradient(28px 28px at 14px 12px, rgba(56,255,160,.25), rgba(12,22,34,.90) 58%)",
        border: "1px solid rgba(22,224,255,.35)",
        boxShadow: `0 0 36px ${glow}, inset 0 0 0 1px rgba(160,220,255,.18)`,
        cursor: "pointer",
        opacity: visible ? 1 : 0.35,
        transition: "opacity .25s ease, transform .25s ease",
        zIndex: 1200,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          position: "absolute", inset: -18, borderRadius: 999,
          background: `radial-gradient(130px 130px at 22px 22px, ${glow}, transparent 60%)`,
          filter: "blur(6px)",
          animation: "orbPulse 2.4s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes orbPulse {
          0%   { transform: scale(0.98); opacity: .75; }
          50%  { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(0.98); opacity: .75; }
        }
      `}</style>
    </div>
  );
}
