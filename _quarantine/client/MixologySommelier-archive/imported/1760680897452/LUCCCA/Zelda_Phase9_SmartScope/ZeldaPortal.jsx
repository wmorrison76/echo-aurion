import React, { useEffect, useState } from "react";
import "./ZeldaWidget.css";

export default function ZeldaPortal() {
  const [status, setStatus] = useState("🟡 Scanning...");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch("/zelda/zelda-status.json")
      .then(res => res.json())
      .then(data => {
        setStatus(data.status || "✅ Healthy");
        setLogs(data.logs || []);
      });
  }, []);

  return (
    <div className="zelda-mini-window">
      <div className="zelda-header">🧬 Zelda Mini Portal</div>
      <div className="zelda-status">Status: {status}</div>
      <div className="zelda-log">
        {logs.map((log, i) => (
          <div key={i} className="zelda-log-entry">🔧 {log}</div>
        ))}
      </div>
    </div>
  );
}
