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
