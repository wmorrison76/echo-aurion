
// src/board/BackboardFX.jsx
import React from "react";

export default function BackboardFX({ children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `var(--backboard-bg), var(--backboard-overlay)`,
        backgroundSize: "cover, cover",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {/* Content host to keep stacking order sane */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
