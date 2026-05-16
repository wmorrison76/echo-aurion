import React from "react";
import { cn } from "@/lib/glass";
import { appendAuditEntry } from "@/lib/ops-audit";
import {
  appendConfirmation,
  listConfirmations,
  setConfirmationStatus,
} from "@/lib/ops-confirmations";
import type { OpsConfirmation } from "@shared/types/confirmations";

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

export function BeoConfirmationsPanel({
  eventId,
  beoId,
}: {
  eventId: string | null;
  beoId: string | null;
}) {
  const [seeded, setSeeded] = React.useState(false);

  const confirmations = React.useMemo(() => {
    if (!eventId) return [] as OpsConfirmation[];
    return listConfirmations({ eventId, limit: 50 });
  }, [eventId, seeded]);

  // Demo seed: create an AI recipe confirmation scenario once per event view
  React.useEffect(() => {
    if (!eventId) return;
    if (seeded) return;
    if (confirmations.length > 0) return;
    appendConfirmation({
      eventId,
      beoId: beoId ?? undefined,
      kind: "recipe.ai_generated",
      message:
        "EchoAI couldn't find an existing recipe → generated a candidate recipe. Awaiting user confirmation.",
      link: { kind: "recipe" },
    });
    setSeeded(true);
  }, [eventId, confirmations.length, seeded, beoId]);

  if (!eventId) {
    return (
      <div className="rounded-lg border border-border/20 bg-background/40 p-3 text-xs text-foreground/60">
        Select an event to view confirmations.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border/10 flex items-center justify-between">
        <div className="text-xs font-semibold text-foreground">
          AI Confirmations
        </div>
        <button
          type="button"
          onClick={() => {
            appendConfirmation({
              eventId,
              beoId: beoId ?? undefined,
              kind: "recipe.user_accepted",
              status: "pending",
              message:
                "User accepted AI recipe proposal. Confirmations required.",
              link: { kind: "recipe" },
            });
            appendAuditEntry({
              eventId,
              beoId: beoId ?? undefined,
              entityType: "revision",
              entityId: eventId,
              action: "task.percent_change",
              summary: "AI recipe accepted (demo)",
            });
            setSeeded((v) => !v);
          }}
          className="text-[11px] px-2 py-1 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
        >
          + Demo confirmation
        </button>
      </div>

      <div className="p-3 space-y-2">
        {confirmations.length === 0 ? (
          <div className="text-xs text-foreground/60">
            No confirmations pending.
          </div>
        ) : (
          confirmations.map((c) => (
            <div
              key={c.id}
              className="rounded-md border border-border/20 bg-background/30 p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-foreground/70 truncate">
                    {c.message}
                  </div>
                  <div className="mt-0.5 text-[11px] text-foreground/50">
                    {c.kind} • {suggestStatus(c.status)} • {fmt(c.at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.link ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("ops:navigate", {
                            detail: { kind: c.link?.kind, eventId },
                          }),
                        )
                      }
                      className="text-[11px] px-2 py-1 rounded-md border border-border/30 text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                    >
                      Open
                    </button>
                  ) : null}
                  {c.status !== "confirmed" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmationStatus({
                          id: c.id,
                          status: "confirmed",
                        });
                        appendConfirmation({
                          eventId,
                          beoId: beoId ?? undefined,
                          kind: "recipe.confirmed",
                          status: "confirmed",
                          message: "User confirmed AI recipe for this BEO.",
                          link: { kind: "recipe" },
                        });
                        appendAuditEntry({
                          eventId,
                          beoId: beoId ?? undefined,
                          entityType: "revision",
                          entityId: eventId,
                          action: "task.percent_change",
                          summary: "Recipe confirmed",
                        });
                        setSeeded((v) => !v);
                      }}
                      className={cn(
                        "text-[11px] px-2 py-1 rounded-md border transition-colors",
                        "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/15",
                      )}
                    >
                      Confirm
                    </button>
                  ) : (
                    <span className="text-[11px] px-2 py-1 rounded-md border bg-foreground/5 text-foreground/60 border-border/20">
                      Confirmed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function suggestStatus(status: string): string {
  return status === "confirmed" ? "confirmed" : "pending";
}
