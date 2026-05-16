import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/glass";
import { maestroEventBus, EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";
import { useAlertsStore, type Alert } from "@/stores/useAlertsStore";

type SystemPreferences = {
  notifications?: {
    desktop?: boolean;
    inApp?: boolean;
    doNotDisturb?: boolean;
    purchasingAlerts?: boolean;
  };
};

function readSystemPreferences(): SystemPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("system-preferences");
    return raw ? (JSON.parse(raw) as SystemPreferences) : null;
  } catch {
    return null;
  }
}

function allowPurchasingAlerts(prefs: SystemPreferences | null): boolean {
  const n = prefs?.notifications;
  if (n?.doNotDisturb === true) return false;
  if (n?.inApp === false) return false;
  if (n?.purchasingAlerts === false) return false;
  return true;
}

function allowDesktopNotifications(prefs: SystemPreferences | null): boolean {
  const n = prefs?.notifications;
  if (n?.doNotDisturb === true) return false;
  if (n?.desktop === false) return false;
  return true;
}

function toAlertType(raw: unknown): Alert["type"] {
  const value = String(raw ?? "medium");
  if (value === "critical") return "critical";
  if (value === "high") return "high";
  if (value === "low") return "low";
  return "medium";
}

export function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const alerts = useAlertsStore((s) => s.alerts);
  const hydrate = useAlertsStore((s) => s.hydrate);
  const addAlerts = useAlertsStore((s) => s.addAlerts);
  const upsertAlert = useAlertsStore((s) => s.upsertAlert);
  const dismissAlert = useAlertsStore((s) => s.dismissAlert);
  const dismissAll = useAlertsStore((s) => s.clearAll);
  const notifyRef = useRef<HTMLDivElement>(null);
  const forecastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;

    // Wrap in async IIFE to ensure errors are properly caught
    (async () => {
      try {
        const res = await fetch("/api/dashboard/notifications");
        if (!res.ok) return;

        const data = await res.json() as { alerts?: Array<{ id: string; title: string; message: string; type: string; timestamp: number; module?: string }> };
        if (cancelled) return;

        const list = data.alerts ?? [];
        if (list.length) addAlerts(list.map((a) => ({ ...a, type: a.type as Alert["type"] })));
      } catch {
        // Silently ignore all errors (network, parsing, etc.)
      }
    })();

    return () => { cancelled = true; };
  }, [addAlerts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifyRef.current &&
        !notifyRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const unsub = maestroEventBus.subscribeTo(
      EVENT_TYPES.SHORTAGE_DETECTED,
      (payload) => {
        const prefs = readSystemPreferences();
        if (!allowPurchasingAlerts(prefs)) return;

        const eventId = String(payload?.eventId ?? "unknown");
        const shortages = Array.isArray(payload?.shortages)
          ? payload.shortages
          : [];
        if (shortages.length === 0) return;

        const priorityRank: Record<string, number> = {
          critical: 3,
          high: 2,
          medium: 1,
          low: 0,
        };

        const highest = shortages.reduce((acc: string, item: any) => {
          const level = String(item?.priority ?? item?.severity ?? "medium");
          return priorityRank[level] > priorityRank[acc] ? level : acc;
        }, "medium");

        const topNames = shortages
          .map((s: any) => String(s?.name ?? s?.ingredientId ?? "Item"))
          .slice(0, 3);

        const remaining = Math.max(shortages.length - topNames.length, 0);
        const suffix = remaining > 0 ? `, +${remaining} more` : "";

        const message =
          topNames.length > 0
            ? `Projected shortage based on updated guest demand: ${topNames.join(
                ", ",
              )}${suffix}. Review Order Guide to place a PO.`
            : "Projected shortage based on updated guest demand. Review Order Guide to place a PO.";

        const alert: Alert = {
          id: `purchasing-shortage-${eventId}`,
          title: "Purchasing Forecast Alert",
          message,
          type: toAlertType(highest),
          timestamp: Date.now(),
          module: "purchasing-receiving",
        };

        upsertAlert(alert);

        if (
          allowDesktopNotifications(prefs) &&
          typeof window !== "undefined" &&
          "Notification" in window
        ) {
          try {
            if (Notification.permission === "granted") {
              new Notification(alert.title, { body: alert.message });
            }
          } catch {
            // ignore
          }
        }
      },
    );

    return () => unsub();
  }, [upsertAlert]);

  useEffect(() => {
    const unsub = maestroEventBus.subscribeTo(
      EVENT_TYPES.GUEST_COUNT_CHANGED,
      (payload) => {
        const prefs = readSystemPreferences();
        if (!allowPurchasingAlerts(prefs)) return;

        const nextCount = Number(payload?.newCount);
        if (!Number.isFinite(nextCount) || nextCount <= 0) return;

        if (forecastTimerRef.current) {
          window.clearTimeout(forecastTimerRef.current);
        }

        forecastTimerRef.current = window.setTimeout(async () => {
          const eventId = String(payload?.eventId ?? "guest-count");
          try {
            const mod =
              await import("@/modules/PurchRec/services/orderGuide.service");
            const rows = await mod.generateOrderGuide({
              coverCount: nextCount,
              baselineCovers: 150,
            });

            const shortageRows = rows
              .filter(
                (r: any) =>
                  typeof r?.suggestedBase === "number" && r.suggestedBase > 0,
              )
              .sort((a: any, b: any) => (b.extCost || 0) - (a.extCost || 0))
              .slice(0, 3);

            if (shortageRows.length === 0) return;

            const top = shortageRows.map((r: any) =>
              String(r.ingredient?.name ?? "Item"),
            );
            const message = `Guest count updated to ${nextCount}. Suggested orders: ${top.join(
              ", ",
            )}. Open Purchasing to review and send a PO.`;

            upsertAlert({
              id: `purchasing-forecast-${eventId}`,
              title: "Purchasing Preview",
              message,
              type: "medium",
              timestamp: Date.now(),
              module: "purchasing-receiving",
            });
          } catch {
            // ignore
          }
        }, 600);
      },
    );

    return () => {
      if (forecastTimerRef.current) {
        window.clearTimeout(forecastTimerRef.current);
      }
      unsub();
    };
  }, [upsertAlert]);

  const handleAlertClick = (alert: Alert) => {
    if (alert.module) {
      window.dispatchEvent(
        new CustomEvent("open-panel", { detail: { id: alert.module } }),
      );
    }
    setIsOpen(false);
  };

  const criticalCount = alerts.filter((a) => a.type === "critical").length;
  const highCount = alerts.filter((a) => a.type === "high").length;

  const getTypeColor = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "high":
        return "bg-orange-500/20 text-orange-600 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "low":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
    }
  };

  const getTypeLabel = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "🔴 Critical";
      case "high":
        return "🟠 High";
      case "medium":
        return "🟡 Medium";
      case "low":
        return "🔵 Low";
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (criticalCount > 0) parts.push(`${criticalCount} critical`);
    if (highCount > 0) parts.push(`${highCount} high priority`);
    return parts.join(", ");
  }, [criticalCount, highCount]);

  return (
    <div ref={notifyRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-7 w-7 rounded flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-primary/15 transition-colors flex-shrink-0"
        title="Notifications & Alerts"
      >
        <Bell size={14} />
        {alerts.length > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-3.5 h-3.5 bg-destructive text-white text-[10px] font-bold rounded-full">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Alerts</h3>
              <p className="text-xs text-foreground/60">{summaryText}</p>
            </div>
            {alerts.length > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs px-2 py-1 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {alerts.length > 0 ? (
            <div className="overflow-y-auto flex-1">
              <div className="divide-y divide-border/30">
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className="w-full p-4 text-left hover:bg-primary/10 transition-colors border-l-4 border-transparent hover:border-primary"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium border whitespace-nowrap mt-0.5",
                          getTypeColor(alert.type),
                        )}
                      >
                        {getTypeLabel(alert.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-foreground">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-foreground/70 mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-foreground/50 mt-2">
                          {formatTime(alert.timestamp)}
                        </p>
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                        className="text-foreground/40 hover:text-foreground/70 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      >
                        <X size={16} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell size={32} className="mx-auto text-foreground/30 mb-2" />
              <p className="text-sm text-foreground/60">All caught up!</p>
              <p className="text-xs text-foreground/50 mt-1">
                No pending alerts
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
