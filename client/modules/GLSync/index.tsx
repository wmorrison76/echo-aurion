import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Link2, Plus, CheckCircle2, RefreshCw, ArrowRightLeft, Database, AlertCircle } from "lucide-react";

const BACKEND = window.location.origin;

interface GLConnection {
  id: string;
  platform: string;
  platform_name: string;
  company_name: string;
  status: string;
  auto_sync: boolean;
  sync_frequency: string;
  account_mappings: Array<{ id: string; luccca_code: string; luccca_name: string; external_code: string; external_name: string }>;
  sync_history: Array<{ id: string; type: string; entries_synced: number; total_debits: number; total_credits: number; completed_at: string }>;
  last_sync: string | null;
}

interface DashboardData {
  total_connections: number;
  active_connections: number;
  total_mappings: number;
  gl_codes_count: number;
  journal_entries_count: number;
  recent_syncs: Array<any>;
  gl_codes: Array<{ id: string; gl_code: string; description: string; account_type: string }>;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

const PLATFORMS: Record<string, { name: string; color: string }> = {
  quickbooks: { name: "QuickBooks Online", color: "text-green-500" },
  sage: { name: "Sage Intacct", color: "text-emerald-600" },
  xero: { name: "Xero", color: "text-blue-500" },
};

export default function GLSyncPanel() {
  const [connections, setConnections] = useState<GLConnection[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMapping, setShowMapping] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "quickbooks", company_name: "", sync_frequency: "daily" });
  const [mappingForm, setMappingForm] = useState({ luccca_code: "", luccca_name: "", external_code: "", external_name: "" });
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, dashRes] = await Promise.all([
        fetch(`${BACKEND}/api/gl-sync/connections`),
        fetch(`${BACKEND}/api/gl-sync/dashboard`),
      ]);
      const connData = await connRes.json();
      const dashData = await dashRes.json();
      setConnections(connData.connections || []);
      setDashboard(dashData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND}/api/gl-sync/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ platform: "quickbooks", company_name: "", sync_frequency: "daily" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivate = async (connId: string) => {
    try {
      await fetch(`${BACKEND}/api/gl-sync/connections/${connId}/activate`, { method: "POST" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMapping = async (connId: string) => {
    try {
      await fetch(`${BACKEND}/api/gl-sync/connections/${connId}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappingForm),
      });
      setMappingForm({ luccca_code: "", luccca_name: "", external_code: "", external_name: "" });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncJournals = async (connId: string) => {
    setSyncing(true);
    try {
      await fetch(`${BACKEND}/api/gl-sync/sync/journals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connId }),
      });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--foreground)]" data-testid="gl-sync-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--primary)]" />
          <h2 className="text-base font-semibold">Accounting GL Sync</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
          data-testid="add-gl-connection-btn"
        >
          <Plus size={12} /> Connect Platform
        </button>
      </div>

      {/* Dashboard Summary */}
      {dashboard && (
        <div className="grid grid-cols-5 gap-3 px-4 py-3">
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="active-connections">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Active</div>
            <p className="text-lg font-bold">{dashboard.active_connections}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">of {dashboard.total_connections} connections</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="total-mappings">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Mappings</div>
            <p className="text-lg font-bold">{dashboard.total_mappings}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">account pairs</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="gl-codes">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">GL Codes</div>
            <p className="text-lg font-bold">{dashboard.gl_codes_count}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="journal-entries">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Journal Entries</div>
            <p className="text-lg font-bold">{dashboard.journal_entries_count}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]" data-testid="recent-syncs-count">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Recent Syncs</div>
            <p className="text-lg font-bold">{dashboard.recent_syncs.length}</p>
          </div>
        </div>
      )}

      {/* New Connection Form */}
      {showForm && (
        <div className="mx-4 mb-3 rounded-lg border border-[var(--border)] p-4 bg-[var(--card)]" data-testid="gl-connection-form">
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                data-testid="gl-platform-select"
              >
                {Object.entries(PLATFORMS).map(([key, p]) => (
                  <option key={key} value={key}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">Company Name</label>
              <input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g., LUCCCA Resort LLC"
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                required
                data-testid="gl-company-name"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] block mb-1">Frequency</label>
              <select
                value={form.sync_frequency}
                onChange={(e) => setForm({ ...form, sync_frequency: e.target.value })}
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                data-testid="gl-sync-frequency"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs rounded border border-[var(--border)] text-[var(--muted-foreground)]">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-xs rounded bg-[var(--primary)] text-[var(--primary-foreground)]" data-testid="submit-gl-connection">Connect</button>
            </div>
          </form>
        </div>
      )}

      {/* Connections */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-16">
            <Link2 size={32} className="mx-auto mb-2 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm text-[var(--muted-foreground)]">No accounting connections configured.</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Connect QuickBooks, Sage, or Xero to sync GL data.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4" data-testid={`gl-connection-${conn.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {conn.status === "active" ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-yellow-500" />}
                    <span className="font-medium text-sm">{conn.company_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded bg-[var(--sidebar-accent)] ${PLATFORMS[conn.platform]?.color || ""}`}>{conn.platform_name}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{conn.sync_frequency}</span>
                  </div>
                  <div className="flex gap-2">
                    {conn.status !== "active" && (
                      <button onClick={() => handleActivate(conn.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]" data-testid={`activate-${conn.id}`}>
                        <CheckCircle2 size={10} /> Activate
                      </button>
                    )}
                    <button onClick={() => setShowMapping(showMapping === conn.id ? null : conn.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]" data-testid={`toggle-mappings-${conn.id}`}>
                      <ArrowRightLeft size={10} /> Mappings ({conn.account_mappings?.length || 0})
                    </button>
                    {conn.status === "active" && (
                      <button onClick={() => handleSyncJournals(conn.id)} disabled={syncing} className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-50" data-testid={`sync-journals-${conn.id}`}>
                        <RefreshCw size={10} className={syncing ? "animate-spin" : ""} /> Sync Journals
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Mappings */}
                {showMapping === conn.id && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Account Mappings</p>
                    {conn.account_mappings && conn.account_mappings.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {conn.account_mappings.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-xs bg-[var(--sidebar-accent)] rounded px-2 py-1">
                            <Database size={10} className="text-[var(--primary)]" />
                            <span className="font-mono">{m.luccca_code}</span>
                            <span className="text-[var(--muted-foreground)]">{m.luccca_name}</span>
                            <ArrowRightLeft size={10} className="text-[var(--muted-foreground)]" />
                            <span className="font-mono">{m.external_code}</span>
                            <span className="text-[var(--muted-foreground)]">{m.external_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 items-center">
                      <input placeholder="LUCCCA Code" value={mappingForm.luccca_code} onChange={(e) => setMappingForm({ ...mappingForm, luccca_code: e.target.value })} className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]" data-testid="mapping-luccca-code" />
                      <input placeholder="LUCCCA Name" value={mappingForm.luccca_name} onChange={(e) => setMappingForm({ ...mappingForm, luccca_name: e.target.value })} className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]" data-testid="mapping-luccca-name" />
                      <ArrowRightLeft size={14} className="text-[var(--muted-foreground)]" />
                      <input placeholder="External Code" value={mappingForm.external_code} onChange={(e) => setMappingForm({ ...mappingForm, external_code: e.target.value })} className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]" data-testid="mapping-external-code" />
                      <input placeholder="External Name" value={mappingForm.external_name} onChange={(e) => setMappingForm({ ...mappingForm, external_name: e.target.value })} className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]" data-testid="mapping-external-name" />
                      <button onClick={() => handleAddMapping(conn.id)} className="px-3 py-1 text-[10px] rounded bg-emerald-600 text-white hover:bg-emerald-500" data-testid="add-mapping-btn">Add</button>
                    </div>
                  </div>
                )}

                {/* Sync History */}
                {conn.sync_history && conn.sync_history.length > 0 && (
                  <div className="mt-2 border-t border-[var(--border)] pt-2 space-y-1">
                    {conn.sync_history.slice(-3).reverse().map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        <span>{s.entries_synced} entries synced (D: {formatCurrency(s.total_debits)} / C: {formatCurrency(s.total_credits)})</span>
                        <span>— {new Date(s.completed_at).toLocaleString()}</span>
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
