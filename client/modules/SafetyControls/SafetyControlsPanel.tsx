/**
 * SafetyControlsPanel
 * Safe Mode (read-only, disable actions/agent execute, allow audit export + trace viewing; RBAC gated).
 * Global kill switch (agents + echo actions): immediate enforcement, trace emission for who toggled and why.
 */

import React, { useState } from "react";
import { Shield, Power, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SafetyControlsPanel() {
  const [safeMode, setSafeMode] = useState(false);
  const [killSwitch, setKillSwitch] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSafeMode = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/safety/safe-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: !safeMode,
          reason:
            reason || (safeMode ? "Disabled safe mode" : "Enabled safe mode"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSafeMode(!!data.enabled);
        setMessage(data.traceId ? "Trace emitted" : "Updated");
      } else setMessage(data.error || "Failed");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleKillSwitch = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/safety/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: !killSwitch,
          reason:
            reason || (killSwitch ? "Agents re-enabled" : "Agents disabled"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setKillSwitch(!!data.enabled);
        setMessage(data.traceId ? "Trace emitted" : "Updated");
      } else setMessage(data.error || "Failed");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Safety Controls
      </h2>
      <p className="text-sm text-muted-foreground">
        RBAC gated. All toggles emit trace (who, why).
      </p>

      <section className="border border-border rounded-lg p-4">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4" />
          Safe Mode
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Read-only operations; disable actions and agent execute; allow audit
          export + trace viewing.
        </p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required for audit)"
          className="w-full border border-input rounded px-3 py-2 text-sm mb-2 bg-background"
        />
        <button
          type="button"
          disabled={loading}
          onClick={handleSafeMode}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium",
            safeMode ? "bg-amber-600 text-white" : "bg-muted text-foreground",
          )}
        >
          {safeMode ? "Disable Safe Mode" : "Enable Safe Mode"}
        </button>
      </section>

      <section className="border border-destructive/50 rounded-lg p-4 bg-destructive/5">
        <h3 className="font-medium flex items-center gap-2 mb-2 text-destructive">
          <Power className="h-4 w-4" />
          Global kill switch (agents + Echo actions)
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Immediate enforcement; trace emission for who toggled and why.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={handleKillSwitch}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium",
            killSwitch
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {killSwitch ? "Re-enable agents" : "Disable agents (kill switch)"}
        </button>
      </section>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
