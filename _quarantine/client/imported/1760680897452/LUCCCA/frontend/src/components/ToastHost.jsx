
// src/components/ToastHost.jsx
import React, { useEffect, useState } from "react";
import { onToast } from "@/lib/toastBus.js";

export function ToastHost(){
  const [toasts, setToasts] = useState([]);
  useEffect(() => onToast(t => {
    const id = Math.random().toString(36).slice(2);
    setToasts(x => [...x, { id, ...t }]);
    setTimeout(() => setToasts(x => x.filter(tt => tt.id !== id)), t.duration ?? 3000);
  }), []);

  return (
    <div style={{ position:"fixed", right: 16, bottom: 16, display:"grid", gap: 10, zIndex: 1000 }}>
      {toasts.map(t => (
        <div key={t.id} className="card" style={{ minWidth: 240 }}>
          <div style={{ fontWeight:600 }}>{t.title ?? "Notice"}</div>
          <div className="small muted">{t.message}</div>
        </div>
      ))}
    </div>
  );
}
