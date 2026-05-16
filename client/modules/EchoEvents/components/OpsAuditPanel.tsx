import React from "react";
import { listAuditEntries } from "@/lib/ops-audit";
import { cn } from "@/lib/glass";

function fmt(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function OpsAuditPanel({ eventId }: { eventId: string }) {
  const entries = React.useMemo(
    () => listAuditEntries({ eventId, limit: 30 }),
    [eventId],
  );

  return (
    <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border/10 text-xs font-semibold text-foreground">
        Audit trail
      </div>
      <div className="p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="text-xs text-foreground/60">
            No audit entries yet.
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="rounded-md border border-border/20 bg-background/30 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-foreground/70 truncate">
                  <span className="text-foreground/50">{e.actor.role}</span>
                  {e.actor.name ? ` • ${e.actor.name}` : ""} • {e.summary}
                </div>
                <div className="text-[11px] text-foreground/50 whitespace-nowrap">
                  {fmt(e.at)}
                </div>
              </div>
              <div className={cn("mt-0.5 text-[11px] text-foreground/50")}>
                {e.entityType}:{e.entityId} • {e.action}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
