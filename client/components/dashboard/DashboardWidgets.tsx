import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  X,
  ExternalLink,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { safeFetchJson } from "@/lib/safe-fetch";

export interface WidgetProps {
  id: string;
  name: string;
  icon: string;
  minimized: boolean;
  showHeader: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  onPin: () => void;
  isPinned: boolean;
}

// Labor Cost Widget - fetches from /api/dashboard/labor-cost
export function LaborCostWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [laborPct, setLaborPct] = useState<number | null>(null);
  const [trend, setTrend] = useState<number>(0);
  const [targetPct, setTargetPct] = useState<number>(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{ laborPct?: number; trend?: number; targetPct?: number }>(
          "/api/dashboard/labor-cost",
          {},
          { laborPct: null, trend: 0, targetPct: 25 } as any,
        );
        if (cancelled) return;
        setLaborPct(data?.laborPct ?? null);
        setTrend(data?.trend ?? 0);
        setTargetPct(data?.targetPct ?? 25);
      } catch {
        if (!cancelled) setLaborPct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const overBudget = laborPct != null && targetPct != null && laborPct > targetPct;

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Labor Cost %"
      icon="💼"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "text-center transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && laborPct != null && (
          <>
            <div className="text-3xl font-bold text-foreground mb-2">
              {laborPct.toFixed(1)}%
            </div>
            <div className="flex items-center justify-center gap-2 text-xs">
              {trend > 0 ? (
                <>
                  <TrendingUp size={14} className="text-red-500" />
                  <span className="text-red-500">+{trend.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown size={14} className="text-green-500" />
                  <span className="text-green-500">{trend.toFixed(1)}%</span>
                </>
              )}
            </div>
            <div className="mt-3 text-xs text-foreground/60">
              Target: {targetPct}% | Status: {overBudget ? "Over Budget" : "On Target"}
            </div>
          </>
        )}
      </div>
    </DashboardWidget>
  );
}

// Revenue Widget - fetches from /api/dashboard/ops-metrics
export function RevenueWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [revenue, setRevenue] = useState<number | null>(null);
  const [covers, setCovers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{ revenue?: number; covers?: number }>(
          "/api/dashboard/ops-metrics",
          {},
          { revenue: null, covers: null } as any,
        );
        if (cancelled) return;
        setRevenue(data?.revenue ?? null);
        setCovers(data?.covers ?? null);
      } catch {
        if (!cancelled) setRevenue(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Revenue & Covers"
      icon="💵"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "space-y-3 transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && revenue != null && covers != null && (
          <>
        <div>
          <div className="text-xl font-bold text-green-500">
            ${revenue.toLocaleString()}
          </div>
          <div className="text-xs text-foreground/60">Today's Revenue</div>
        </div>
        <div className="h-px bg-border/20" />
        <div>
          <div className="text-xl font-bold text-foreground">{covers}</div>
          <div className="text-xs text-foreground/60">Covers Seated</div>
        </div>
          </>
        )}
      </div>
    </DashboardWidget>
  );
}

// Occupancy Widget - fetches from /api/dashboard/occupancy
export function OccupancyWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{ occupancyPct?: number }>(
          "/api/dashboard/occupancy",
          {},
          { occupancyPct: null } as any,
        );
        if (cancelled) return;
        setOccupancy(data?.occupancyPct ?? null);
      } catch {
        if (!cancelled) setOccupancy(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Occupancy %"
      icon="🏪"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "space-y-3 transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && occupancy != null && (
          <>
            <div className="relative h-8 bg-background/60 rounded-full overflow-hidden border border-border/20">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${occupancy}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground/70">Capacity</span>
              <span className="font-semibold text-foreground">{occupancy}%</span>
            </div>
          </>
        )}
      </div>
    </DashboardWidget>
  );
}

// Orders Widget - fetches from /api/dashboard/orders
export function OrdersWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [orders, setOrders] = useState<{ id: number; table: string; items: number; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{
          orders?: { id: number; table: string; items: number; status: string }[];
        }>("/api/dashboard/orders", {}, { orders: [] } as any);
        if (cancelled) return;
        setOrders(data?.orders ?? []);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Orders"
      icon="📋"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "space-y-1.5 transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && orders.map((order) => (
          <div
            key={order.id}
            className="p-1.5 rounded bg-background/40 border border-border/20 flex justify-between items-center text-xs"
          >
            <div>
              <span className="font-medium text-xs">Table {order.table}</span>
              <span className="text-foreground/60 ml-1 text-xs">
                ({order.items} items)
              </span>
            </div>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-xs",
                order.status === "cooking"
                  ? "bg-orange-500/20 text-orange-600"
                  : "bg-yellow-500/20 text-yellow-600",
              )}
            >
              {order.status}
            </span>
          </div>
        ))}
        {!loading && !error && !orders.length && (
          <div className="text-sm text-foreground/60 py-4">No orders</div>
        )}
      </div>
    </DashboardWidget>
  );
}

// Delivery Widget - fetches from /api/dashboard/delivery
export function DeliveryWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [deliveries, setDeliveries] = useState<{ id: number; vendor: string; items: number; time: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{
          deliveries?: { id: number; vendor: string; items: number; time: string }[];
        }>("/api/dashboard/delivery", {}, null);
        if (!data) throw new Error("Failed to load deliveries");
        if (cancelled) return;
        setDeliveries(data.deliveries ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Deliveries"
      icon="🚚"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "space-y-1.5 transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="p-1.5 rounded bg-background/40 border border-border/20 text-xs"
          >
            <div className="font-medium text-foreground text-xs">
              {delivery.vendor}
            </div>
            <div className="text-foreground/60 flex justify-between mt-1 text-xs">
              <span>{delivery.items} items</span>
              <span className="text-green-500">{delivery.time}</span>
            </div>
          </div>
        ))}
        {!loading && !error && !deliveries.length && (
          <div className="text-sm text-foreground/60 py-4">No deliveries</div>
        )}
      </div>
    </DashboardWidget>
  );
}

// Clock Widget - fetches from /api/dashboard/staff-status (team at a glance)
function formatSince(since: Date): string {
  const diff = Date.now() - since.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function ClockWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [staff, setStaff] = useState<{ id: string; name: string; status: string; since: Date }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{
          staff?: { id: string; name: string; status: string; since: string }[];
        }>("/api/dashboard/staff-status", {}, null);
        if (!data) throw new Error("Failed to load staff");
        const { staff: list } = data;
        if (cancelled) return;
        setStaff(
          (list ?? []).map((s: { id: string; name: string; status: string; since: string }) => ({
            id: s.id,
            name: s.name.split(" ")[0] ?? s.name,
            status: s.status,
            since: new Date(s.since),
          }))
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Team Clock"
      icon="⏰"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "space-y-1.5 transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && staff.map((member) => (
          <div
            key={member.id}
            className="p-1.5 rounded bg-background/40 border border-border/20 flex justify-between items-center text-xs"
          >
            <div className="font-medium text-xs">{member.name}</div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  member.status === "on-duty"
                    ? "bg-green-500"
                    : member.status === "break"
                      ? "bg-yellow-500"
                      : "bg-gray-500",
                )}
              />
              <span className="text-foreground/60 text-xs">{formatSince(member.since)}</span>
            </div>
          </div>
        ))}
        {!loading && !error && !staff.length && (
          <div className="text-sm text-foreground/60 py-4">No staff data</div>
        )}
      </div>
    </DashboardWidget>
  );
}

// VIP Alerts Widget - fetches from /api/dashboard/vip-alerts
export function VIPAlertsWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [alerts, setAlerts] = useState<{ id: number; guest: string; time: string; party: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{
          alerts?: { id: number; guest: string; time: string; party: number }[];
        }>("/api/dashboard/vip-alerts", {}, null);
        if (!data) throw new Error("Failed to load VIP alerts");
        if (cancelled) return;
        setAlerts(data.alerts ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="VIP Alerts"
      icon="🔔"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "space-y-1.5 transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-1.5 rounded bg-purple-500/10 border border-purple-500/30 text-xs"
          >
            <div className="font-medium text-purple-400 text-xs">
              {alert.guest}
            </div>
            <div className="text-foreground/70 flex justify-between mt-1 text-xs">
              <span>{alert.time}</span>
              <span>Party of {alert.party}</span>
            </div>
          </div>
        ))}
        {!loading && !error && !alerts.length && (
          <div className="text-sm text-foreground/60 py-4">No VIP alerts</div>
        )}
      </div>
    </DashboardWidget>
  );
}

// Messages Widget - fetches from /api/dashboard/messages
export function MessagesWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{ unreadCount?: number }>(
          "/api/dashboard/messages",
          {},
          null,
        );
        if (!data) throw new Error("Failed to load messages");
        if (cancelled) return;
        setUnreadCount(data.unreadCount ?? 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Messages"
      icon="💬"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "text-center transition-opacity",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && unreadCount !== null && (
          <>
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {unreadCount}
            </div>
            <div className="text-xs text-foreground/60">Unread Messages</div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "messaging" } }))}
              className="mt-3 w-full px-3 py-1 text-xs rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
            >
              View Messages
            </button>
          </>
        )}
      </div>
    </DashboardWidget>
  );
}

// Schedule Connected Widget - Shows daily staffing at a glance
export function ScheduleConnectedWidget(props: any) {
  const {
    minimized,
    showHeader,
    onMinimize,
    onPin,
    onDetach,
    isPinned,
    widgetId,
  } = props;
  const [staffData, setStaffData] = React.useState<{
    totalScheduled: number;
    withSchedule: number;
    today: string;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const cancelledRef = React.useRef(false);
  const loadRealScheduleData = React.useCallback(async () => {
    cancelledRef.current = false;
    setIsLoading(true);

    const data = await safeFetchJson<{
      totalScheduled?: number;
      withSchedule?: number;
      today?: string;
    }>("/api/dashboard/schedule-summary", {}, null);

    if (cancelledRef.current) return;
    if (data?.totalScheduled != null && data.withSchedule != null && data.today) {
      setStaffData({
        totalScheduled: data.totalScheduled,
        withSchedule: data.withSchedule,
        today: data.today,
      });
      setIsLoading(false);
      return;
    }

    try {
      const scheduleKey = `shiftflow:schedule:Main`;
      const scheduleStr = localStorage.getItem(scheduleKey);
      if (!scheduleStr) {
        setStaffData(null);
        setIsLoading(false);
        return;
      }
      const scheduleData = JSON.parse(scheduleStr);
      const employees = scheduleData.employees || [];
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const today = days[new Date().getDay()];
      let withScheduleCount = 0;
      employees.forEach((emp: any) => {
        const shift = emp.shifts?.[today];
        if (shift && (shift.value || shift.in || shift.out)) withScheduleCount++;
      });
      setStaffData({
        totalScheduled: employees.length,
        withSchedule: withScheduleCount,
        today,
      });
    } catch {
      setStaffData(null);
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRealScheduleData();

    // Listen for Schedule module updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("shiftflow:schedule")) {
        void loadRealScheduleData();
      }
    };

    // Also listen for custom events from Schedule module
    const handleScheduleUpdate = () => {
      void loadRealScheduleData();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("shiftflow:schedule-updated", handleScheduleUpdate);

    return () => {
      cancelledRef.current = true;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("shiftflow:schedule-updated", handleScheduleUpdate);
    };
  }, [loadRealScheduleData]);

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title="Staff Schedule"
      icon="👥"
      widgetId={widgetId}
    >
      <div
        className={cn(
          "space-y-3",
          minimized && "opacity-0 pointer-events-none",
        )}
      >
        {isLoading ? (
          <div className="text-center py-4 text-foreground/50">
            <p className="text-xs">Loading schedule...</p>
          </div>
        ) : !staffData ? (
          <div className="text-center py-4 text-foreground/50">
            <p className="text-xs mb-2">No schedule data</p>
            <p className="text-xs text-foreground/40">
              Open Schedule module to add staff
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Total Employees */}
            <div className="p-2 rounded bg-background/40 border border-border/20">
              <div className="text-sm font-semibold text-foreground">
                {staffData.totalScheduled}
              </div>
              <div className="text-xs text-foreground/60">Total Employees</div>
            </div>

            {/* Today's Schedule */}
            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
              <div className="text-sm font-semibold text-blue-400">
                {staffData.withSchedule}
              </div>
              <div className="text-xs text-foreground/60">
                Scheduled for {staffData.today}
              </div>
            </div>

            {/* Prompt to add schedule */}
            {staffData.withSchedule === 0 && (
              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-600">
                No shifts scheduled. Add shifts in Schedule module.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}

// Satisfaction Widget - fetches from /api/dashboard/satisfaction
export function SatisfactionWidget(props: any) {
  const { minimized, showHeader, onMinimize, onPin, onDetach, isPinned, widgetId } = props;
  const [score, setScore] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [trend, setTrend] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{
          score?: number;
          target?: number;
          trend?: number;
        }>("/api/dashboard/satisfaction", {}, null);
        if (!data) throw new Error("Failed to load");
        if (cancelled) return;
        setScore(data.score ?? null);
        setTarget(data.target ?? null);
        setTrend(data.trend ?? 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const t = setInterval(fetchData, 300000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <DashboardWidget showHeader={showHeader} minimized={minimized} onMinimize={onMinimize} onPin={onPin} onDetach={onDetach} isPinned={isPinned} title="Guest Satisfaction" icon="⭐" widgetId={widgetId}>
      <div className={cn("text-center py-4 transition-opacity", minimized && "opacity-0 pointer-events-none")}>
        {loading && <div className="text-sm text-foreground/60">Loading…</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}
        {!loading && !error && score != null && (
          <>
            <div className="text-3xl font-bold text-foreground">{score.toFixed(1)}</div>
            <div className="text-xs text-foreground/60 mt-1">Target: {target ?? "—"} {trend !== 0 && (trend > 0 ? "↑" : "↓")}</div>
          </>
        )}
      </div>
    </DashboardWidget>
  );
}

// Sales Trend Widget - fetches from /api/dashboard/sales-trend
export function SalesTrendWidget(props: any) {
  const { minimized, showHeader, onMinimize, onPin, onDetach, isPinned, widgetId } = props;
  const [hours, setHours] = useState<{ hour: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await safeFetchJson<{ hours?: { hour: number; revenue: number }[] }>(
          "/api/dashboard/sales-trend",
          {},
          null,
        );
        if (!data) throw new Error("Failed to load");
        if (cancelled) return;
        setHours(data.hours ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const t = setInterval(fetchData, 300000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const maxRev = hours.length ? Math.max(...hours.map((h) => h.revenue)) : 1;

  return (
    <DashboardWidget showHeader={showHeader} minimized={minimized} onMinimize={onMinimize} onPin={onPin} onDetach={onDetach} isPinned={isPinned} title="Sales Trend" icon="📈" widgetId={widgetId}>
      <div className={cn("space-y-2 py-2 transition-opacity", minimized && "opacity-0 pointer-events-none")}>
        {loading && <div className="text-sm text-foreground/60 py-4">Loading…</div>}
        {error && <div className="text-sm text-destructive py-4">{error}</div>}
        {!loading && !error && hours.length > 0 && (
          <div className="flex items-end gap-0.5 h-16">
            {hours.map((h, i) => (
              <div key={i} className="flex-1 bg-primary/30 rounded-t min-w-0" style={{ height: `${(h.revenue / maxRev) * 100}%` }} title={`${h.hour}:00 $${h.revenue}`} />
            ))}
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}

// Generic fallback widget (no "Coming soon" - production-ready empty state)
export function GenericWidget(props: any) {
  const { minimized, showHeader, onMinimize, onPin, onDetach, isPinned, title, icon, widgetId } = props;
  return (
    <DashboardWidget showHeader={showHeader} minimized={minimized} onMinimize={onMinimize} onPin={onPin} onDetach={onDetach} isPinned={isPinned} title={title || "Widget"} icon={icon || "📊"} widgetId={widgetId}>
      <div className={cn("text-center py-4 transition-opacity", minimized && "opacity-0 pointer-events-none")}>
        <div className="text-3xl mb-2">{icon || "📊"}</div>
        <p className="text-xs text-foreground/60">{title || "Widget"}</p>
        <p className="text-xs text-foreground/40 mt-2">No data configured. Add content in dashboard settings.</p>
      </div>
    </DashboardWidget>
  );
}

// Base Widget Container
interface DashboardWidgetProps {
  showHeader: boolean;
  minimized: boolean;
  onMinimize?: () => void;
  onPin: () => void;
  onDetach?: () => void;
  isPinned: boolean;
  title: string;
  icon: string;
  children: React.ReactNode;
  widgetId?: string;
}

export function DashboardWidget({
  showHeader,
  minimized,
  onPin,
  onDetach,
  isPinned,
  title,
  icon,
  children,
  widgetId,
}: DashboardWidgetProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/30 bg-gradient-to-br from-background/40 to-background/20 backdrop-blur-sm",
        "shadow-lg hover:shadow-xl transition-all",
        "flex flex-col overflow-hidden h-full",
        minimized && "h-12",
      )}
    >
      {!minimized && (
        <div className="flex-1 p-2 overflow-auto text-sm">{children}</div>
      )}
    </div>
  );
}
