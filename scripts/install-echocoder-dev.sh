#!/bin/bash
set -e

echo "🧠 Installing EchoCoder Dev Components..."

BASE="client/components/dev"
mkdir -p "$BASE"

# ---------------------------
# EchoCoderStatusBadge
# ---------------------------
cat > "$BASE/EchoCoderStatusBadge.tsx" <<'EOF'
import { useEffect, useState } from "react";

export default function EchoCoderStatusBadge() {
  const [status, setStatus] = useState<"LOCKED" | "UNLOCKED" | "EXPIRED">("LOCKED");

  useEffect(() => {
    fetch("/api/echocoder/status")
      .then(r => r.json())
      .then(d => setStatus(d.status))
      .catch(() => setStatus("LOCKED"));
  }, []);

  const color =
    status === "UNLOCKED" ? "bg-green-600"
    : status === "EXPIRED" ? "bg-yellow-600"
    : "bg-red-600";

  return (
    <div className={`fixed bottom-3 right-3 px-3 py-1 text-xs text-white rounded ${color}`}>
      EchoCoder: {status}
    </div>
  );
}
EOF

# ---------------------------
# useEchoCoderGuard
# ---------------------------
cat > "$BASE/useEchoCoderGuard.ts" <<'EOF'
import { useEffect } from "react";

export function useEchoCoderGuard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // PANIC LOCK — Cmd + Shift + Esc
      if (e.metaKey && e.shiftKey && e.key === "Escape") {
        fetch("/api/echocoder/lock", { method: "POST" });
        console.warn("[EchoCoder] Panic lock triggered");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
EOF

# ---------------------------
# EchoCoderHotkey
# ---------------------------
cat > "$BASE/EchoCoderHotkey.tsx" <<'EOF'
import { useEffect } from "react";

export default function EchoCoderHotkey() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd + Option + C (very low collision)
      if (e.metaKey && e.altKey && e.key.toLowerCase() === "c") {
        window.dispatchEvent(
          new CustomEvent("open-panel", {
            detail: { id: "echocoder" },
          })
        );
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
EOF

echo "✅ EchoCoder dev components installed"
echo "🔁 Restart dev server: pnpm dev"

