import React from "react";
import { cn } from "@/lib/glass";
import { listAuditEntries } from "@/lib/ops-audit";
import type { OpsAuditEntry } from "@shared/types/audit";

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

export function OpsAuditTrail({
  eventId,
  entityType,
  entityId,
  limit = 20,
}: {
  eventId: string;
  entityType?: OpsAuditEntry["entityType"];
  entityId?: string;
  limit?: number;
}) {
  const entries = React.useMemo(
    () => listAuditEntries({ eventId, entityType, entityId, limit }),
    [eventId, entityType, entityId, limit],
  );

  if (!eventId) return null;

  return (
    <div className="rounded-lg border border-border/20 bg-background/40 p-3">
      <div className="text-xs font-semibold text-foreground mb-2">
        Audit trail
      </div>
      {entries.length === 0 ? (
        <div className="text-xs text-foreground/60">No audit entries yet.</div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
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
              <div className="mt-0.5 text-[11px] text-foreground/50">
                {e.entityType}:{e.entityId} • {e.action}
              </div>
              {e.details ? (
                <div className={cn("mt-1 text-[11px] text-foreground/60")}>
                  {Object.entries(e.details)
                    .slice(0, 4)
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(" • ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
