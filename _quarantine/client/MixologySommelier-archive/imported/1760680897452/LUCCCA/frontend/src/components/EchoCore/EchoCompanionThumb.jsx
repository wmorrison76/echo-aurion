// frontend/src/components/EchoCore/EchoCompanionThumb.jsx
// A simple button component that acts as a companion for the Echo UI.
// It becomes active when the user is idle for a short period,
// allowing them to click it to activate the Echo functionality.
import React, { useEffect, useRef, useState } from "react";

export default function EchoCompanionThumb({ onActivate = () => {} }) {
  const idleTimer = useRef(null);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const bump = () => {
      setIdle(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), 1200); // idle after 1.2s
    };
    window.addEventListener("keydown", bump, true);
    window.addEventListener("input", bump, true);
    window.addEventListener("pointerdown", bump, true);
    bump(); // start timer
    return () => {
      window.removeEventListener("keydown", bump, true);
      window.removeEventListener("input", bump, true);
      window.removeEventListener("pointerdown", bump, true);
      clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <button
      className="echo-companion"
      title={idle ? "Echo: I can help—ready." : "Echo"}
      aria-label="Echo Companion"
      onClick={onActivate}
    >
      <span className="echo-companion__thumb" />
      <span className="echo-companion__pulse" style={{ opacity: idle ? 1 : 0 }} />
    </button>
  );
}
