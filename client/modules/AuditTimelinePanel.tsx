/**
 * LUCCCA — BUILD 20 (Part 2)
 * AuditTimelinePanel
 *
 * PURPOSE:
 * - Read-only forensic timeline for EC / Directors
 * - Shows who did what, where, and when
 *
 * LOCATION:
 * client/modules/AuditTimelinePanel.tsx
 */
import { useEffect, useState } from "react";
import {
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/glass";

type AuditEntry = {
  id: string;
  ts: number;
  actor: string;
  action: string;
  target?: string;
  details?: string;
  severity?: "info" | "warn" | "danger";
};

type Tab = "events" | "inbox";

/**
 * D24 · maps the D18 backend's audit_events row → the AuditEntry
 * shape this panel was originally built for. The backend stores
 *   { occurred_at: ISO, user_name, action, entity_type,
 *     entity_id, module, summary, ... }
 * but the panel renders ts/actor/action/target/details/severity.
 */
function mapBackendEvent(e: any): AuditEntry {
  const sev: AuditEntry["severity"] =
    /reject|expire|fail/i.test(e.action || "") ? "danger" :
    /override|amend|warn/i.test(e.action || "")  ? "warn"   :
    "info";
  return {
    id: String(e.id ?? `${e.module}-${e.entity_id}-${e.occurred_at}`),
    ts: e.occurred_at ? Date.parse(e.occurred_at) : Date.now(),
    actor: e.user_name || e.user_id || `${e.module || "system"}-auto`,
    action: `${e.module || "?"}.${e.action || "?"}`,
    target: e.entity_id,
    details: e.summary || "",
    severity: sev,
  };
}

/**
 * D24 · render pending_approvals rows in the same panel so the chef
 * sees "what's waiting" inline with "what already happened."
 */
function mapInboxItem(p: any): AuditEntry {
  const sev: AuditEntry["severity"] =
    p.urgency === "critical" ? "danger" :
    p.urgency === "high"     ? "warn"   : "info";
  return {
    id: String(p.id ?? `${p.kind}-${p.entity_id}`),
    ts: p.created_at ? Date.parse(p.created_at) : Date.now(),
    actor: p.requested_by_name || p.source_module || "system",
    action: `pending.${p.kind}`,
    target: p.entity_id,
    details: `${p.summary || ""} (urgency: ${p.urgency || "normal"})`,
    severity: sev,
  };
}

export default function AuditTimelinePanel() {
  const [tab, setTab] = useState<Tab>("events");
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActor, setFilterActor] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    loadAuditEntries();
  }, [tab]);

  const loadAuditEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      // D24 · live wired to the D18 backend.
      //   events tab → /api/audit/events?limit=200 (cross-module log)
      //   inbox tab  → /api/audit/inbox             (chef approval queue)
      const path = tab === "inbox"
        ? "/api/audit/inbox"
        : "/api/audit/events?limit=200";
      const res = await fetch(path);
      if (!res.ok) {
        throw new Error(`${path}: ${res.status}`);
      }
      const data = await res.json();
      const mapped: AuditEntry[] = tab === "inbox"
        ? (data.items || []).map(mapInboxItem)
        : (data.events || []).map(mapBackendEvent);
      setItems(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit entries");
      // Soft-fall: empty list so the panel doesn't render stale mock
      // data when the backend is unreachable. The error banner up top
      // tells the operator what happened.
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter((item) => {
    let matches = true;
    if (
      filterActor &&
      !item.actor.toLowerCase().includes(filterActor.toLowerCase())
    ) {
      matches = false;
    }
    if (
      filterAction &&
      !item.action.toLowerCase().includes(filterAction.toLowerCase())
    ) {
      matches = false;
    }
    return matches;
  });

  const getActionIcon = (action: string) => {
    if (action.includes("conflict")) return <AlertTriangle size={14} />;
    if (action.includes("approved")) return <CheckCircle size={14} />;
    return <Clock size={14} />;
  };

  const badgeColor = {
    info: "bg-primary text-white",
    warn: "bg-amber-500 text-white",
    danger: "bg-red-600 text-white",
  };

  const getActorBadgeColor = (actor: string) => {
    if (actor.includes("system")) return "bg-slate-400 text-white";
    if (actor.includes("EC") || actor.includes("Director"))
      return "bg-purple-600 text-white";
    if (actor.includes("Manager")) return "bg-primary text-white";
    return "bg-slate-500 text-white";
  };

  return (
    <div className="p-4 h-full overflow-y-auto font-sans bg-background space-y-4">
      <div className="sticky top-0 bg-background pb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield size={20} />
          Audit Timeline
        </h2>
        <p className="text-xs text-foreground/60 mt-1">
          Forensic view of operational decisions across events, maintenance,
          overrides, and auto-resolved conflicts.
        </p>
        {/* D24 · tab toggle */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setTab("events")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium",
              tab === "events"
                ? "bg-primary text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300",
            )}
          >
            Events
          </button>
          <button
            onClick={() => setTab("inbox")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium",
              tab === "inbox"
                ? "bg-primary text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300",
            )}
          >
            Approval Inbox
          </button>
          <button
            onClick={() => loadAuditEntries()}
            disabled={loading}
            className="ml-auto px-3 py-1.5 rounded text-xs font-medium border border-border/30 hover:bg-slate-50"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            Backend unreachable: {error}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Filter by actor..."
            className="border border-border/30 rounded px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by action..."
            className="border border-border/30 rounded px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          />
        </div>
        <div className="mt-2 text-xs text-foreground/60">
          {filtered.length} of {items.length} entries
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-foreground/50">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading audit log...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-xs text-foreground/60 bg-surface border border-border/20 rounded-md px-3 py-2">
          No audit entries found.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="border border-border/20 rounded-lg px-3 py-2 bg-surface hover:bg-surface/80 transition-colors"
          >
            <div className="flex items-start gap-2 text-xs">
              <div
                className={cn(
                  "flex-shrink-0 rounded-full p-1.5 mt-0.5",
                  item.severity
                    ? badgeColor[item.severity]
                    : "bg-slate-300 text-foreground",
                )}
              >
                {getActionIcon(item.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {item.action}
                  </span>
                  {item.target && (
                    <code className="text-[10px] bg-background px-1.5 py-0.5 rounded text-foreground/70">
                      {item.target}
                    </code>
                  )}
                  <span className="text-[10px] text-foreground/50 ml-auto whitespace-nowrap">
                    {new Date(item.ts).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                {item.details && (
                  <div className="mt-1 text-xs text-foreground/80">
                    {item.details}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      getActorBadgeColor(item.actor),
                    )}
                  >
                    {item.actor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[11px] text-foreground/60 bg-surface border border-border/20 rounded-lg px-3 py-2 space-y-1">
        <div className="font-semibold text-foreground">💡 Integration Note</div>
        <p>
          This panel reads from mock data. Connect to{" "}
          <code className="text-foreground/80">GET /api/audit?limit=200</code>,
          backed by <code className="text-foreground/80">writeAudit()</code> on
          the server.
        </p>
      </div>
    </div>
  );
}
