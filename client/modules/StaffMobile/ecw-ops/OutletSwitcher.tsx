/** iter224 · Outlet switcher badge — tap to pick from chef's accessible outlets. */
import React from "react";
import { API } from "@/lib/api-url";

export function OutletSwitcher({ outletId, onSwitch }: {
  outletId: string; onSwitch: (id: string) => void;
}) {
  const [outlets, setOutlets] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // iter230 · prefer EchoAurium (8-outlet resort roster);
    // fall back to the legacy endpoint for older non-resort deployments.
    fetch(`${API()}/api/echoaurium/outlets`, {
      headers: { "X-User-Id": "chef-william" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.rows && d.rows.length > 0) {
          setOutlets(d.rows);
          return;
        }
        return fetch(`${API()}/api/ecw-ops/outlets/mine`, {
          headers: { "X-User-Id": "chef-william" },
        })
          .then((r) => r.json())
          .then((d2) => setOutlets(d2?.outlets || []));
      })
      .catch(() => undefined);
  }, []);

  const current = outlets.find((o) => o.id === outletId) || { name: "Main" };

  if (outlets.length <= 1) {
    return (
      <div data-testid="ecw-outlet-badge" style={{
        padding: "6px 10px", fontSize: 10, color: "#94a3b8",
        border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6,
      }}>
        {current.name}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button data-testid="ecw-outlet-switcher" onClick={() => setOpen((o) => !o)} style={{
        padding: "6px 10px", fontSize: 10, fontWeight: 600,
        background: "rgba(200,169,126,0.08)", color: "#c8a97e",
        border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
      }}>
        {current.name} <span style={{ fontSize: 8 }}>▼</span>
      </button>
      {open && (
        <div data-testid="ecw-outlet-dropdown" style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 60,
          background: "#1a1f2e", border: "1px solid rgba(200,169,126,0.3)",
          borderRadius: 6, minWidth: 160, boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
        }}>
          {outlets.map((o) => (
            <button key={o.id}
              data-testid={`ecw-outlet-${o.id}`}
              onClick={() => {
                onSwitch(o.id);
                setOpen(false);
                fetch(`${API()}/api/ecw-ops/outlets/switch`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
                  body: JSON.stringify({ outlet_id: o.id }),
                });
              }}
              style={{
                display: "block", width: "100%", padding: "10px 12px",
                background: o.id === outletId ? "rgba(200,169,126,0.12)" : "transparent",
                color: o.id === outletId ? "#c8a97e" : "#f5efe4",
                border: "none", textAlign: "left", fontSize: 12, cursor: "pointer",
              }}>
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
