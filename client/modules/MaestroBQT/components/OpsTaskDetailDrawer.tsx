import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/glass";
import { appendAuditEntry } from "@/lib/ops-audit";
import { canToggleMenuLock, getOpsRole } from "@/lib/ops-rbac";
import { appendConfirmation } from "@/lib/ops-confirmations";
import type { OpsEvent, OpsTask } from "@shared/types/ops-gantt";
import { buildLinkedObjectsForTask } from "../lib/link-graph";
import {
  createRevisionSnapshot,
  diffRevisions,
  loadRevisions,
  saveRevisions,
  setMenuLocked,
} from "../lib/revision-store";
import { OpsAuditTrail } from "./OpsAuditTrail";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export function OpsTaskDetailDrawer({
  open,
  onOpenChange,
  opsEvent,
  task,
  allTasks,
  onTaskUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opsEvent: OpsEvent | null;
  task: OpsTask | null;
  allTasks: OpsTask[];
  onTaskUpdate?: (
    taskId: string,
    patch: Partial<Pick<OpsTask, "status" | "percentComplete">>,
  ) => void;
}) {
  const eventId = opsEvent?.eventId ?? task?.eventId ?? "";

  const revisions = React.useMemo(
    () => (eventId ? loadRevisions(eventId) : []),
    [eventId, open],
  );
  const lastRev = revisions.length > 0 ? revisions[revisions.length - 1] : null;
  const menuLocked = Boolean(lastRev?.menuLocked);

  const linked = React.useMemo(() => {
    if (!task) return [];
    return buildLinkedObjectsForTask({ eventId: task.eventId, task });
  }, [task]);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmPayload, setConfirmPayload] = React.useState<{
    title: string;
    body: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Ensure we have a baseline revision once per event (in drawer lifetime).
  React.useEffect(() => {
    if (!open) return;
    if (!opsEvent) return;
    if (revisions.length > 0) return;
    const baseline = createRevisionSnapshot({
      opsEvent,
      tasks: allTasks,
      previous: null,
      summary: "Baseline",
    });
    saveRevisions(opsEvent.eventId, [baseline]);
  }, [open, opsEvent, revisions.length, allTasks]);

  const handleCreateRevision = React.useCallback(() => {
    if (!opsEvent) return;
    const next = createRevisionSnapshot({
      opsEvent,
      tasks: allTasks,
      previous: lastRev,
      summary: "Manual snapshot",
    });
    saveRevisions(opsEvent.eventId, [...revisions, next]);
  }, [opsEvent, lastRev, revisions, allTasks]);

  const handleToggleMenuLock = React.useCallback(() => {
    if (!eventId) return;
    const role = getOpsRole();
    if (!canToggleMenuLock(role)) {
      window.alert("Menu lock requires Chef/Sous/Admin.");
      return;
    }
    setMenuLocked(eventId, !menuLocked);
    appendAuditEntry({
      eventId,
      beoId: eventId ? `beo-${eventId}` : undefined,
      entityType: "menu_lock",
      entityId: eventId,
      action: menuLocked ? "menu.unlock" : "menu.lock",
      summary: menuLocked ? "Menu unlocked" : "Menu locked",
    });
  }, [eventId, menuLocked]);

  return (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmPayload?.title ?? "Open"}</DialogTitle>
            <DialogDescription>{confirmPayload?.body ?? ""}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-9 px-3 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirmPayload?.onConfirm()}
              className="h-9 px-3 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25"
            >
              {confirmPayload?.actionLabel ?? "Open"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[520px] sm:max-w-[520px] p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-4 border-b border-border/20">
              <SheetTitle>Details</SheetTitle>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-xs text-foreground/60 truncate">
                  {opsEvent?.eventName ?? `Event ${eventId || "—"}`}
                </div>
                <button
                  type="button"
                  onClick={handleToggleMenuLock}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-md border transition-colors",
                    menuLocked
                      ? "bg-red-500/10 text-red-600 border-red-500/25 hover:bg-red-500/15"
                      : "bg-background text-foreground/70 border-border/30 hover:text-foreground hover:bg-foreground/5",
                  )}
                  title="Menu lock (demo)"
                >
                  {menuLocked ? "Menu locked" : "Menu unlocked"}
                </button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Task */}
              <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                <div className="text-sm font-semibold text-foreground">
                  {task?.title ?? "No task selected"}
                </div>
                {task ? (
                  <>
                    <div className="mt-1 text-xs text-foreground/60">
                      {task.scope.toUpperCase()} •{" "}
                      {task.department.toUpperCase()} • {task.status}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-border/20 bg-background/30 p-2">
                        <div className="text-[11px] text-foreground/60 mb-1">
                          Status
                        </div>
                        <select
                          value={task.status}
                          onChange={(e) =>
                            onTaskUpdate?.(task.taskId, {
                              status: e.target.value as any,
                            })
                          }
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                        >
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                      <div className="rounded-md border border-border/20 bg-background/30 p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-foreground/60">
                            Progress
                          </div>
                          <div className="text-[11px] text-foreground/60">
                            {Math.round(task.percentComplete)}%
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={Math.round(task.percentComplete)}
                          onChange={(e) =>
                            onTaskUpdate?.(task.taskId, {
                              percentComplete: Number(e.target.value),
                            })
                          }
                          className="mt-2 w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border border-border/20 bg-background/30 p-2">
                        <div className="text-foreground/60">Start</div>
                        <div className="text-foreground">{fmt(task.start)}</div>
                      </div>
                      <div className="rounded-md border border-border/20 bg-background/30 p-2">
                        <div className="text-foreground/60">End</div>
                        <div className="text-foreground">{fmt(task.end)}</div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Dependencies */}
              {task && (
                <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                  <div className="text-xs font-semibold text-foreground mb-2">
                    Dependencies
                  </div>
                  {(task.dependencies || []).length === 0 ? (
                    <div className="text-xs text-foreground/60">None</div>
                  ) : (
                    <div className="space-y-1">
                      {task.dependencies?.map((d) => (
                        <div
                          key={`${d.dependsOnTaskId}-${d.type}`}
                          className="text-xs text-foreground/70"
                        >
                          {d.type ?? "FS"} → {d.dependsOnTaskId}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Linked objects */}
              {task && (
                <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                  <div className="text-xs font-semibold text-foreground mb-2">
                    Linked objects
                  </div>
                  <div className="space-y-1">
                    {linked.map((o) => (
                      <div
                        key={`${o.kind}:${o.id}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="text-xs text-foreground/70 truncate">
                          <span className="text-foreground/50">{o.kind}</span> •{" "}
                          {o.label}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const title = `Open ${o.kind}`;
                            const body =
                              o.kind === "recipe"
                                ? "EchoAI generated/confirmed recipe view will open for this BEO."
                                : o.kind === "purchase_order" ||
                                    o.kind === "receiving"
                                  ? "Ordering/Receiving view will open for this BEO."
                                  : "Linked object view will open.";
                            setConfirmPayload({
                              title,
                              body,
                              actionLabel: "Open",
                              onConfirm: () => {
                                // Use a global navigation event to let the host module route.
                                window.dispatchEvent(
                                  new CustomEvent("ops:navigate", {
                                    detail: { kind: o.kind, id: o.id, eventId },
                                  }),
                                );
                                if (
                                  eventId &&
                                  (o.kind === "recipe" ||
                                    o.kind === "menu_item")
                                ) {
                                  appendConfirmation({
                                    eventId,
                                    beoId: eventId
                                      ? `beo-${eventId}`
                                      : undefined,
                                    kind: "recipe.opened",
                                    status: "pending",
                                    message:
                                      "User opened AI recipe/menu confirmation view.",
                                    link: { kind: "recipe", id: o.id },
                                  });
                                }
                                setConfirmOpen(false);
                              },
                            });
                            setConfirmOpen(true);
                          }}
                          className="text-[11px] px-2 py-1 rounded-md border border-border/30 text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
                          title="Open"
                        >
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revisions */}
              <div className="rounded-lg border border-border/20 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-semibold text-foreground">
                    Revisions
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateRevision}
                    className="text-[11px] px-2 py-1 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                    disabled={!opsEvent}
                  >
                    Snapshot
                  </button>
                </div>

                {revisions.length <= 1 ? (
                  <div className="text-xs text-foreground/60">
                    No revision history yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {revisions
                      .slice()
                      .reverse()
                      .map((rev, idx, arr) => {
                        const prev = arr[idx + 1];
                        const diff = prev ? diffRevisions(prev, rev) : null;
                        return (
                          <div
                            key={rev.revision}
                            className="rounded-md border border-border/20 bg-background/30 p-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold text-foreground">
                                Rev {rev.revision}
                              </div>
                              <div className="text-[11px] text-foreground/50">
                                {fmt(rev.createdAt)}
                              </div>
                            </div>
                            {diff ? (
                              <div className="mt-1 text-[11px] text-foreground/60">
                                fields: {diff.changedFields.length} • shifted:{" "}
                                {diff.tasksShifted} • +{diff.tasksAdded}/-
                                {diff.tasksRemoved}
                              </div>
                            ) : (
                              <div className="mt-1 text-[11px] text-foreground/60">
                                baseline
                              </div>
                            )}
                            {diff &&
                            (diff.changedFields.length > 0 ||
                              diff.tasksShifted > 0) ? (
                              <div className="mt-1 text-[11px] text-foreground/50">
                                {diff.changedFields.length > 0
                                  ? `changed: ${diff.changedFields.slice(0, 3).join(",")}${diff.changedFields.length > 3 ? "…" : ""}`
                                  : ""}
                                {diff.tasksShifted > 0
                                  ? ` • impacted tasks: ${diff.shiftedKeys.length}`
                                  : ""}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Audit */}
              {eventId ? (
                <OpsAuditTrail
                  eventId={eventId}
                  entityType={task ? "task" : undefined}
                  entityId={task?.taskId}
                  limit={20}
                />
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
