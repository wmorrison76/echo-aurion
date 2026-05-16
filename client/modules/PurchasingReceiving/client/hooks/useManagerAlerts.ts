import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
interface ManagerAlert {
  id: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description?: string;
  status: "active" | "acknowledged" | "resolved" | "dismissed";
  actionRequired: boolean;
  outletId?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  outlet?: { name: string };
}
interface AlertNotification {
  id: string;
  alertId: string;
  deliveryMethod: "dashboard" | "email" | "sms" | "push";
  deliveryStatus: "pending" | "sent" | "failed" | "read";
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  managerAlert?: ManagerAlert;
}
interface AlertSubscription {
  id: string;
  alertType: string;
  minSeverity: string;
  deliveryMethods: string[];
  outletIds: string[];
  enabled: boolean;
}
interface AlertSummary {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
}
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
} // ============================================================================
// MANAGER ALERTS HOOK
// ============================================================================ export function useManagerAlerts(limit = 50) { const [alerts, setAlerts] = useState<ManagerAlert[]>([]); const [pagination, setPagination] = useState({ total: 0, limit, offset: 0, hasMore: false, }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user } = useAuth(); const fetchAlerts = useCallback( async (offset = 0, status?: string) => { if (!user) return; try { setLoading(true); const params = new URLSearchParams({ limit: String(limit), offset: String(offset), status: status ||"active", }); const response = await fetch(`/api/manager-alerts/alerts?${params}`, { headers: {"x-user-id": user.id }, }); if (!response.ok) throw new Error("Failed to fetch alerts"); const { data, pagination: pag } = (await response.json()) as PaginatedResponse<ManagerAlert>; setAlerts(data); setPagination(pag); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [limit, user] ); const acknowledgeAlert = useCallback( async (alertId: string) => { if (!user) return null; try { const response = await fetch(`/api/manager-alerts/alerts/${alertId}/acknowledge`, { method:"PATCH", headers: {"x-user-id": user.id }, }); if (!response.ok) throw new Error("Failed to acknowledge alert"); await fetchAlerts(); return await response.json(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchAlerts] ); const resolveAlert = useCallback( async (alertId: string, notes?: string) => { if (!user) return null; try { const response = await fetch(`/api/manager-alerts/alerts/${alertId}/resolve`, { method:"PATCH", headers: {"Content-Type":"application/json","x-user-id": user.id, }, body: JSON.stringify({ notes }), }); if (!response.ok) throw new Error("Failed to resolve alert"); await fetchAlerts(); return await response.json(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchAlerts] ); useEffect(() => { fetchAlerts(); }, [fetchAlerts]); return { alerts, pagination, loading, error, acknowledgeAlert, resolveAlert, refetch: fetchAlerts, }; }
// ============================================================================
// ALERT NOTIFICATIONS HOOK
// ============================================================================ export function useAlertNotifications(limit = 20) { const [notifications, setNotifications] = useState<AlertNotification[]>([]); const [pagination, setPagination] = useState({ total: 0, limit, offset: 0, hasMore: false, }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user } = useAuth(); const fetchNotifications = useCallback( async (offset = 0) => { if (!user) return; try { setLoading(true); const params = new URLSearchParams({ limit: String(limit), offset: String(offset), status:"delivered", }); const response = await fetch(`/api/manager-alerts/notifications?${params}`, { headers: {"x-user-id": user.id }, }); if (!response.ok) throw new Error("Failed to fetch notifications"); const { data, pagination: pag } = (await response.json()) as PaginatedResponse<AlertNotification>; setNotifications(data); setPagination(pag); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [limit, user] ); const markAsRead = useCallback( async (notificationId: string) => { if (!user) return null; try { const response = await fetch(`/api/manager-alerts/notifications/${notificationId}/read`, { method:"PATCH", headers: {"x-user-id": user.id }, }); if (!response.ok) throw new Error("Failed to mark as read"); await fetchNotifications(); return await response.json(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchNotifications] ); useEffect(() => { fetchNotifications(); }, [fetchNotifications]); return { notifications, pagination, loading, error, markAsRead, refetch: fetchNotifications, }; }
// ============================================================================
// ALERT SUBSCRIPTIONS HOOK
// ============================================================================ export function useAlertSubscriptions() { const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user, organization } = useAuth(); const fetchSubscriptions = useCallback(async () => { if (!user) return; try { setLoading(true); const response = await fetch("/api/manager-alerts/subscriptions", { headers: {"x-user-id": user.id }, }); if (!response.ok) throw new Error("Failed to fetch subscriptions"); const data = await response.json(); setSubscriptions(data); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [user]); const subscribe = useCallback( async (alertType: string, minSeverity?: string, deliveryMethods?: string[]) => { if (!user || !organization) return null; try { const response = await fetch("/api/manager-alerts/subscriptions", { method:"POST", headers: {"Content-Type":"application/json","x-user-id": user.id,"x-org-id": organization.id, }, body: JSON.stringify({ organizationId: organization.id, alertType, minSeverity: minSeverity ||"medium", deliveryMethods: deliveryMethods || ["dashboard"], }), }); if (!response.ok) throw new Error("Failed to subscribe"); await fetchSubscriptions(); return await response.json(); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, organization, fetchSubscriptions] ); const unsubscribe = useCallback( async (subscriptionId: string) => { if (!user) return null; try { const response = await fetch(`/api/manager-alerts/subscriptions/${subscriptionId}`, { method:"DELETE", headers: {"x-user-id": user.id }, }); if (!response.ok) throw new Error("Failed to unsubscribe"); await fetchSubscriptions(); return true; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchSubscriptions] ); useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]); return { subscriptions, loading, error, subscribe, unsubscribe, refetch: fetchSubscriptions, }; }
// ============================================================================
// ALERT SUMMARY HOOK
// ============================================================================ export function useAlertSummary() { const [summary, setSummary] = useState<AlertSummary | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { organization } = useAuth(); const fetchSummary = useCallback(async () => { if (!organization) return; try { setLoading(true); const response = await fetch("/api/manager-alerts/summary", { headers: {"x-org-id": organization.id }, }); if (!response.ok) throw new Error("Failed to fetch summary"); const data = await response.json(); setSummary(data.summary); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [organization]); useEffect(() => { fetchSummary(); const interval = setInterval(fetchSummary, 30000); // Refresh every 30 seconds return () => clearInterval(interval); }, [fetchSummary]); return { summary, loading, error, refetch: fetchSummary, }; }
