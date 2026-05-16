import React, { useState, useEffect, useCallback } from "react";
import { Plug, RefreshCw, Link, Unlink, Database, Receipt, BookOpen, FileText, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BACKEND}/api/pos-gl${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "connections" | "toast" | "quickbooks" | "sync-log";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "connections", label: "Connections", icon: Plug },
  { id: "toast", label: "Toast POS", icon: Receipt },
  { id: "quickbooks", label: "QuickBooks", icon: BookOpen },
  { id: "sync-log", label: "Sync Log", icon: Clock },
];

export default function PosGlHubPanel() {
  const [tab, setTab] = useState<TabId>("connections");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="pos-gl-hub-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(34,197,94,0.15))", border: "1px solid rgba(249,115,22,0.25)" }}>
          <Plug className="w-[18px] h-[18px] text-orange-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">POS & GL Hub</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Toast POS + QuickBooks Online Integration</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`posgl-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#f97316" : "transparent", color: tab === t.id ? "#fdba74" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "connections" && <ConnectionsTab />}
        {tab === "toast" && <ToastTab />}
        {tab === "quickbooks" && <QuickBooksTab />}
        {tab === "sync-log" && <SyncLogTab />}
      </div>
    </div>
  );
}

function ConnectionsTab() {
  const [status, setStatus] = useState<any>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const load = useCallback(() => { api("/status").then(setStatus).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  if (!status) return <Loading />;

  const connect = async (provider: string) => {
    setConnecting(provider);
    try {
      if (provider === "toast") {
        await api("/toast/connect", { method: "POST", body: JSON.stringify({ client_id: "demo-toast-id", client_secret: "demo-secret", restaurant_external_id: "demo-restaurant" }) });
      } else {
        await api("/quickbooks/connect", { method: "POST", body: JSON.stringify({ client_id: "demo-qb-id", realm_id: "demo-realm" }) });
      }
      load();
    } finally { setConnecting(null); }
  };

  const disconnect = async (provider: string) => {
    await api(`/disconnect/${provider}`, { method: "POST" });
    load();
  };

  return (
    <div className="space-y-4" data-testid="posgl-connections-tab">
      {status.integrations.map((int_: any) => {
        const isConnected = int_.status === "connected";
        return (
          <div key={int_.provider} data-testid={`connection-${int_.provider}`}
            className={cn("rounded-lg border p-4", isConnected ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-700/30 bg-slate-800/40")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {int_.provider === "toast" ? <Receipt className="w-5 h-5 text-orange-400" /> : <BookOpen className="w-5 h-5 text-green-400" />}
                <span className="text-sm font-semibold text-white">{int_.name}</span>
                <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border",
                  isConnected ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-slate-700/40 text-slate-500 border-slate-600/20"
                )}>{int_.status}</span>
              </div>
              {isConnected ? (
                <button onClick={() => disconnect(int_.provider)}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/20 hover:bg-rose-500/25">
                  <Unlink className="w-3 h-3" /> Disconnect
                </button>
              ) : (
                <button onClick={() => connect(int_.provider)} disabled={connecting === int_.provider}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 disabled:opacity-50">
                  <Link className="w-3 h-3" /> {connecting === int_.provider ? "Connecting..." : "Connect"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {int_.features.map((f: string) => (
                <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-400 font-mono">{f}</span>
              ))}
            </div>
            {int_.last_sync && <div className="text-[9px] text-slate-500 mt-2">Last sync: {new Date(int_.last_sync).toLocaleString()}</div>}
          </div>
        );
      })}
    </div>
  );
}

function ToastTab() {
  const [orders, setOrders] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api("/toast/orders?limit=10").then(setOrders).catch(() => {});
    api("/toast/menu-sync").then(setMenu).catch(() => {});
  }, []);

  const runSync = async () => {
    setSyncing(true);
    try { await api("/toast/sync", { method: "POST" }); } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-4" data-testid="posgl-toast-tab">
      <button onClick={runSync} disabled={syncing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/20 text-orange-300 text-xs font-mono uppercase tracking-wider disabled:opacity-50">
        <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} /> {syncing ? "Syncing..." : "Sync Toast Data"}
      </button>

      {menu && (
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/20 p-4">
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Menu Sync ({menu.synced_items} items)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {menu.categories.map((cat: any) => (
              <div key={cat.name} className="bg-slate-700/20 rounded px-2 py-1.5">
                <div className="text-[10px] text-slate-400">{cat.name}</div>
                <div className="text-xs text-white font-mono">{cat.items} items — ${cat.avg_price}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recent Orders ({orders.total})</h3>
          <div className="space-y-1.5">
            {orders.orders.map((o: any) => (
              <div key={o.order_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-orange-300">{o.order_id}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">{o.order_type}</span>
                  <span className="text-[10px] text-slate-500">{o.server}</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">${o.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickBooksTab() {
  const [accounts, setAccounts] = useState<any>(null);
  const [pl, setPl] = useState<any>(null);

  useEffect(() => {
    api("/quickbooks/chart-of-accounts").then(setAccounts).catch(() => {});
    api("/quickbooks/profit-loss").then(setPl).catch(() => {});
  }, []);

  return (
    <div className="space-y-4" data-testid="posgl-quickbooks-tab">
      {pl && (
        <div className="bg-slate-800/30 rounded-lg border border-emerald-500/15 p-4">
          <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">Profit & Loss Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <Kpi label="Total Revenue" value={`$${(pl.revenue.total / 1000).toFixed(0)}K`} accent="text-emerald-400" />
            <Kpi label="COGS" value={`$${(pl.cost_of_goods.total / 1000).toFixed(0)}K`} accent="text-amber-400" />
            <Kpi label="Net Income" value={`$${(pl.net_income / 1000).toFixed(0)}K`} accent="text-cyan-400" />
            <Kpi label="Net Margin" value={`${(pl.net_margin_pct * 100).toFixed(1)}%`} accent="text-violet-400" />
          </div>
          <div className="space-y-1">
            {Object.entries(pl.revenue).filter(([k]) => k !== "total").map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px]">
                <span className="text-slate-400 capitalize">{k} Revenue</span>
                <span className="text-white font-mono">${(v as number).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {accounts && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Chart of Accounts ({accounts.total_accounts})</h3>
          <div className="space-y-1">
            {accounts.accounts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-slate-500 w-10">{a.id}</span>
                  <span className="text-xs text-white">{a.name}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono",
                    a.type === "Revenue" ? "bg-emerald-500/15 text-emerald-300" :
                    a.type === "CostOfGoodsSold" ? "bg-amber-500/15 text-amber-300" :
                    "bg-blue-500/15 text-blue-300"
                  )}>{a.type}</span>
                </div>
                <span className="text-xs font-mono text-white">${a.balance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SyncLogTab() {
  const [logs, setLogs] = useState<any>(null);
  useEffect(() => { api("/sync-log?limit=20").then(setLogs).catch(() => {}); }, []);

  return (
    <div className="space-y-3" data-testid="posgl-synclog-tab">
      {!logs ? <Loading /> : logs.logs.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-8">No sync events yet. Connect and sync a provider.</div>
      ) : (
        logs.logs.map((log: any) => (
          <div key={log.sync_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
            <div className="flex items-center gap-2">
              {log.status === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
               log.type === "webhook" ? <Database className="w-3.5 h-3.5 text-blue-400" /> :
               <XCircle className="w-3.5 h-3.5 text-rose-400" />}
              <span className="text-xs text-white">{log.provider}</span>
              <span className="text-[9px] font-mono text-slate-500">{log.type || "sync"}</span>
              {log.event_type && <span className="text-[9px] text-slate-400">{log.event_type}</span>}
            </div>
            <span className="text-[9px] text-slate-500">{log.received_at ? new Date(log.received_at).toLocaleString() : log.completed_at ? new Date(log.completed_at).toLocaleString() : ""}</span>
          </div>
        ))
      )}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}
