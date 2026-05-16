import React, { useState, useEffect, useCallback } from "react";
import { Plug, Wifi, WifiOff, RefreshCw, Plus, CheckCircle2, Clock, AlertTriangle, Zap } from "lucide-react";

const BACKEND = window.location.origin;

interface POSSystem {
  name: string;
  features: string[];
  sync_types: string[];
  auth_type: string;
  status: string;
}

interface POSConnection {
  id: string;
  pos_system: string;
  display_name: string;
  pos_name: string;
  location_id: string;
  status: string;
  last_sync: string | null;
  sync_history: Array<{ id: string; type: string; status: string; records_synced: number; completed_at: string; details?: string }>;
  created_at: string;
}

export default function POSConnectorPanel() {
  const [systems, setSystems] = useState<Record<string, POSSystem>>({});
  const [connections, setConnections] = useState<POSConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pos_system: "toast", display_name: "", location_id: "" });
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sysRes, connRes] = await Promise.all([
        fetch(`${BACKEND}/api/pos-connector/systems`),
        fetch(`${BACKEND}/api/pos-connector/connections`),
      ]);
      const sysData = await sysRes.json();
      const connData = await connRes.json();
      setSystems(sysData.systems || {});
      setConnections(connData.connections || []);
    } catch (err) {
      console.error("Failed to load POS data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND}/api/pos-connector/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ pos_system: "toast", display_name: "", location_id: "" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async (connId: string) => {
    try {
      await fetch(`${BACKEND}/api/pos-connector/connections/${connId}/test`, { method: "POST" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async (connId: string, syncType: string = "full") => {
    setSyncing(connId);
    try {
      await fetch(`${BACKEND}/api/pos-connector/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connId, sync_type: syncType }),
      });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(null);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "connected") return <Wifi size={12} className="text-emerald-500" />;
    if (status === "pending_verification") return <Clock size={12} className="text-yellow-500" />;
    return <WifiOff size={12} className="text-red-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--foreground)]" data-testid="pos-connector-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Plug size={18} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold">POS Connector</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
          data-testid="add-pos-connection-btn"
        >
          <Plus size={12} /> Add Connection
        </button>
      </div>

      {/* Supported Systems Overview */}
      <div className="grid grid-cols-5 gap-2 px-4 py-3">
        {Object.entries(systems).map(([key, sys]) => (
          <div key={key} className="rounded-lg border border-[var(--border)] p-2 bg-[var(--card)] text-center" data-testid={`pos-system-${key}`}>
            <Zap size={16} className="mx-auto mb-1 text-[var(--primary)]" />
            <p className="text-xs font-medium">{sys.name}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{sys.features.length} features</p>
          </div>
        ))}
      </div>

      {/* New Connection Form */}
      {showForm && (
        <div className="mx-4 mb-3 rounded-lg border border-[var(--border)] p-4 bg-[var(--card)]" data-testid="pos-connection-form">
          <form onSubmit={handleCreateConnection} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">POS System</label>
              <select
                value={form.pos_system}
                onChange={(e) => setForm({ ...form, pos_system: e.target.value })}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                data-testid="pos-system-select"
              >
                {Object.entries(systems).map(([key, sys]) => (
                  <option key={key} value={key}>{sys.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">Display Name</label>
              <input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="e.g., Main Restaurant"
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                required
                data-testid="pos-display-name"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">Location ID</label>
              <input
                value={form.location_id}
                onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                placeholder="Optional"
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                data-testid="pos-location-id"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--muted-foreground)]">
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90" data-testid="submit-pos-connection">
                Connect
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Connections List */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-16">
            <Plug size={32} className="mx-auto mb-2 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-[var(--muted-foreground)] text-sm">No POS connections configured.</p>
            <p className="text-[var(--muted-foreground)] text-xs mt-1">Click "Add Connection" to integrate your POS system.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4" data-testid={`pos-connection-${conn.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {statusIcon(conn.status)}
                    <span className="font-medium text-sm">{conn.display_name || conn.pos_name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--sidebar-accent)] text-[var(--muted-foreground)]">{conn.pos_name}</span>
                  </div>
                  <div className="flex gap-2">
                    {conn.status === "pending_verification" && (
                      <button
                        onClick={() => handleTestConnection(conn.id)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        data-testid={`test-connection-${conn.id}`}
                      >
                        <CheckCircle2 size={10} /> Verify
                      </button>
                    )}
                    <button
                      onClick={() => handleSync(conn.id)}
                      disabled={syncing === conn.id}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
                      data-testid={`sync-${conn.id}`}
                    >
                      <RefreshCw size={10} className={syncing === conn.id ? "animate-spin" : ""} /> Sync
                    </button>
                  </div>
                </div>
                {conn.last_sync && (
                  <p className="text-[10px] text-[var(--muted-foreground)]">Last sync: {new Date(conn.last_sync).toLocaleString()}</p>
                )}
                {conn.sync_history && conn.sync_history.length > 0 && (
                  <div className="mt-2 border-t border-[var(--border)] pt-2 space-y-1">
                    {conn.sync_history.slice(-3).reverse().map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        <span>{s.details || `${s.type} sync — ${s.records_synced} records`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
