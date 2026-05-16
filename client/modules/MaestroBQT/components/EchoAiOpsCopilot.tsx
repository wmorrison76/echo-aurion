import React from "react";
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/glass";
import type { Event, Space } from "../types";
import type { OpsTask } from "@shared/types/ops-gantt";
import { detectConflicts } from "@shared/ops-gantt/conflicts";
import { computeRiskAndReadiness } from "@shared/ops-gantt/risk";
import { listConfirmations } from "@/lib/ops-confirmations";
import { appendAuditEntry } from "@/lib/ops-audit";
import { EchoDialogueBus } from "@/core/ai3/EchoDialogueBus";
import { deriveOpsForEvent } from "../lib/derived-ops-cache";

type Recommendation = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  actionLabel: string;
  action: () => void;
};

function sevStyles(sev: Recommendation["severity"]) {
  if (sev === "critical") return "border-red-500/25 bg-red-500/10 text-red-700";
  if (sev === "warning")
    return "border-amber-500/25 bg-amber-500/10 text-amber-700";
  return "border-border/30 bg-background text-foreground/70";
}

export function EchoAiOpsCopilot({
  events,
  spaces,
  selectedEvent,
  onSelectEvent,
  onNavigate,
  mode,
  refreshing,
}: {
  events: Event[];
  spaces: Space[];
  selectedEvent: Event | null;
  onSelectEvent: (event: Event) => void;
  onNavigate: (tabId: string) => void;
  mode: "beo" | "production";
  refreshing?: boolean;
}) {
  const spacesById = React.useMemo(
    () => new Map(spaces.map((s) => [s.id, s])),
    [spaces],
  );
  const selectedEventId = selectedEvent?.id ? String(selectedEvent.id) : "";

  const derived = React.useMemo(() => {
    if (!selectedEvent)
      return {
        tasks: [] as OpsTask[],
        risk: null as any,
        conflicts: [] as any[],
      };
    const includeProductionScope = mode !== "beo";
    const base = deriveOpsForEvent({
      event: selectedEvent,
      spacesById,
      includeProductionScope: true,
    });
    const tasks = includeProductionScope
      ? base.tasks
      : base.tasks.filter((t) => t.scope === "beo");
    const conflicts = detectConflicts(tasks);
    const risk = computeRiskAndReadiness(tasks, { conflicts });
    return { tasks, conflicts, risk };
  }, [selectedEvent, spacesById, mode]);

  const confirmations = React.useMemo(() => {
    if (!selectedEventId) return [];
    return listConfirmations({ eventId: selectedEventId });
  }, [selectedEventId]);

  const pendingConfirmations = confirmations.filter(
    (c) => c.status === "pending",
  );

  const recs = React.useMemo<Recommendation[]>(() => {
    if (!selectedEvent) return [];
    const out: Recommendation[] = [];

    const r = derived.risk;
    const readiness = r?.summary?.readinessPct ?? 0;
    const riskScore = r?.summary?.eventRiskScore ?? 0;

    if (pendingConfirmations.length > 0) {
      out.push({
        id: "confirmations",
        severity: "warning",
        title: "Pending AI confirmations",
        detail: `${pendingConfirmations.length} pending confirmations (recipes/orders).`,
        actionLabel: "Open Recipes",
        action: () => {
          onNavigate("recipes");
          window.dispatchEvent(
            new CustomEvent("ops:navigate", {
              detail: { kind: "recipe", eventId: selectedEvent.id },
            }),
          );
        },
      });
    }

    if (riskScore >= 70) {
      out.push({
        id: "risk-high",
        severity: "critical",
        title: `High risk (${riskScore}/100)`,
        detail:
          "Multiple blockers/conflicts/missing artifacts likely impact readiness.",
        actionLabel: "Open Per‑Event",
        action: () => {
          onNavigate("per-event");
          window.dispatchEvent(
            new CustomEvent("ops:navigate", {
              detail: { kind: "gantt", eventId: selectedEvent.id },
            }),
          );
        },
      });
    } else if (riskScore >= 50) {
      out.push({
        id: "risk-med",
        severity: "warning",
        title: `Elevated risk (${riskScore}/100)`,
        detail: "Review due-soon and blocked tasks.",
        actionLabel: "Open Master Ops",
        action: () => onNavigate("master-ops"),
      });
    }

    if (readiness < 85) {
      const blocked = (r?.tasks || [])
        .filter((t: any) => t.status === "blocked")
        .slice(0, 3);
      out.push({
        id: "readiness",
        severity: readiness < 60 ? "critical" : "warning",
        title: `Readiness ${readiness}%`,
        detail: blocked.length
          ? `Blocked: ${blocked.map((t: any) => t.title).join(" • ")}`
          : "Push completion to hit T‑24 readiness.",
        actionLabel: "Open Critical Path",
        action: () => onNavigate("critical"),
      });
    }

    if (derived.conflicts.length > 0) {
      out.push({
        id: "conflicts",
        severity: "warning",
        title: "Conflicts detected",
        detail: `${derived.conflicts.length} scheduling/resource conflicts in current scope.`,
        actionLabel: "Open Resources",
        action: () => onNavigate("resource"),
      });
    }

    // Always include “send context to EchoAi³”
    out.push({
      id: "broadcast",
      severity: "info",
      title: "Send context to EchoAi³",
      detail:
        "Publish this event’s ops snapshot into the dialogue bus (for copilots / future automations).",
      actionLabel: "Broadcast",
      action: () => {
        const dialogue = EchoDialogueBus.getInstance();
        dialogue.publish("ops", {
          event: "maestro:ai_copilot_snapshot",
          at: Date.now(),
          payload: {
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
            riskSummary: derived.risk?.summary,
            pendingConfirmations: pendingConfirmations.length,
          },
        });
        appendAuditEntry({
          eventId: selectedEvent.id,
          beoId: `beo-${selectedEvent.id}`,
          entityType: "event",
          entityId: selectedEvent.id,
          action: "task.percent_change",
          summary: "EchoAi³ ops snapshot broadcast (MaestroBQT)",
        });
      },
    });

    return out;
  }, [
    selectedEvent,
    derived.risk,
    derived.conflicts.length,
    pendingConfirmations.length,
    onNavigate,
  ]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            EchoAi Ops Copilot
          </div>
          <div className="text-xs text-foreground/60">
            {mode === "beo" ? "BEO mode" : "Production mode"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("ops:navigate", {
                  detail: { kind: "gantt", eventId: selectedEvent?.id },
                }),
              )
            }
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
            disabled={!selectedEvent}
          >
            Open Gantt
          </button>
          <RefreshCw
            className={cn(
              "h-4 w-4 text-foreground/50",
              refreshing && "animate-spin",
            )}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3 p-3">
        <div className="xl:col-span-4 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 text-xs font-semibold text-foreground">
            Events
          </div>
          <div className="overflow-auto h-full divide-y divide-border/10">
            {(events || []).map((e) => {
              const active =
                selectedEventId && String(e.id) === selectedEventId;
              return (
                <button
                  key={String(e.id)}
                  type="button"
                  onClick={() => onSelectEvent(e)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-foreground/5 transition-colors",
                    active && "bg-primary/10",
                  )}
                >
                  <div className="text-sm font-semibold text-foreground truncate">
                    {e.name}
                  </div>
                  <div className="text-[11px] text-foreground/60 truncate">
                    {new Date(e.startDateTime).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • {e.guestCountExpected} guests
                  </div>
                </button>
              );
            })}
            {(events || []).length === 0 ? (
              <div className="p-6 text-sm text-foreground/60">No events.</div>
            ) : null}
          </div>
        </div>

        <div className="xl:col-span-8 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">
              Recommendations
            </div>
            <div className="text-xs text-foreground/60">
              {selectedEvent ? (
                <>
                  {derived.risk?.summary?.readinessPct ?? 0}% ready • risk{" "}
                  {derived.risk?.summary?.eventRiskScore ?? 0} •{" "}
                  {pendingConfirmations.length} confirmations
                </>
              ) : (
                "Select an event"
              )}
            </div>
          </div>
          <div className="p-3 overflow-auto h-full">
            {!selectedEvent ? (
              <div className="p-6 text-sm text-foreground/60">
                Select an event to see EchoAi recommendations.
              </div>
            ) : (
              <div className="space-y-2">
                {recs.map((rec) => (
                  <div
                    key={rec.id}
                    className={cn(
                      "rounded-md border p-3",
                      sevStyles(rec.severity),
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {rec.severity === "critical" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 opacity-70" />
                          )}
                          <div className="text-sm font-semibold truncate">
                            {rec.title}
                          </div>
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                          {rec.detail}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={rec.action}
                        className="h-9 px-3 rounded-md border border-border/30 bg-background/60 text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex items-center gap-2"
                      >
                        {rec.actionLabel} <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
