/** * useIoTAlerts - React hooks for IoT alert management * Handles alert rules, alert instances, automations */ import {
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  IoTAlert,
  IoTAlertRule,
  IoTAutomationAction,
  AlertStatus,
} from "@shared/types/iot";
import * as alertAPI from "@shared/api/iot-alerts";
interface UseAlertsOptions {
  organizationId: string;
  outletId?: string;
  status?: AlertStatus;
  severity?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useIoTAlerts(options: UseAlertsOptions) {
  const [alerts, setAlerts] = useState<IoTAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await alertAPI.getAlerts(options.organizationId, {
        outletId: options.outletId,
        status: options.status,
        severity: options.severity as any,
        limit: 100,
      });
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch alerts"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    options.organizationId,
    options.outletId,
    options.status,
    options.severity,
  ]);
  useEffect(() => {
    fetchAlerts();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchAlerts,
        (options.refreshInterval || 30) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchAlerts, options.autoRefresh, options.refreshInterval]);
  const acknowledgeAlert = useCallback(
    async (alertId: string, acknowledgedBy: string) => {
      try {
        const updated = await alertAPI.acknowledgeAlert(
          alertId,
          acknowledgedBy,
        );
        setAlerts(alerts.map((a) => (a.id === alertId ? updated : a)));
        return updated;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to acknowledge alert");
      }
    },
    [alerts],
  );
  const resolveAlert = useCallback(
    async (alertId: string, resolvedBy: string, notes?: string) => {
      try {
        const updated = await alertAPI.resolveAlert(alertId, resolvedBy, notes);
        setAlerts(alerts.map((a) => (a.id === alertId ? updated : a)));
        return updated;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to resolve alert");
      }
    },
    [alerts],
  );
  const dismissAlert = useCallback(
    async (alertId: string) => {
      try {
        const updated = await alertAPI.dismissAlert(alertId);
        setAlerts(alerts.map((a) => (a.id === alertId ? updated : a)));
        return updated;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to dismiss alert");
      }
    },
    [alerts],
  );
  const openCount = alerts.filter((a) => a.status === "open").length;
  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" && a.status === "open",
  ).length;
  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    summary: { total: alerts.length, open: openCount, critical: criticalCount },
  };
}
interface UseAlertRulesOptions {
  organizationId: string;
  outletId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useAlertRules(options: UseAlertRulesOptions) {
  const [rules, setRules] = useState<IoTAlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await alertAPI.getAlertRules(options.organizationId, {
        outletId: options.outletId,
      });
      setRules(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch alert rules"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId]);
  useEffect(() => {
    fetchRules();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchRules,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchRules, options.autoRefresh, options.refreshInterval]);
  const createRule = useCallback(
    async (rule: Omit<IoTAlertRule, "id" | "created_at" | "updated_at">) => {
      try {
        const newRule = await alertAPI.createAlertRule(rule);
        setRules([...rules, newRule]);
        return newRule;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to create alert rule");
      }
    },
    [rules],
  );
  const updateRule = useCallback(
    async (ruleId: string, updates: Partial<IoTAlertRule>) => {
      try {
        const updated = await alertAPI.updateAlertRule(ruleId, updates);
        setRules(rules.map((r) => (r.id === ruleId ? updated : r)));
        return updated;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to update alert rule");
      }
    },
    [rules],
  );
  const deleteRule = useCallback(
    async (ruleId: string) => {
      try {
        await alertAPI.deleteAlertRule(ruleId);
        setRules(rules.filter((r) => r.id !== ruleId));
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to delete alert rule");
      }
    },
    [rules],
  );
  const enabledCount = rules.filter((r) => r.enabled).length;
  return {
    rules,
    loading,
    error,
    refetch: fetchRules,
    createRule,
    updateRule,
    deleteRule,
    summary: { total: rules.length, enabled: enabledCount },
  };
}
interface UseAlertRuleOptions {
  ruleId: string;
}
export function useAlertRule(options: UseAlertRuleOptions) {
  const [rule, setRule] = useState<IoTAlertRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await alertAPI.getAlertRule(options.ruleId);
        setRule(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch alert rule"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.ruleId]);
  const updateRule = useCallback(
    async (updates: Partial<IoTAlertRule>) => {
      try {
        const updated = await alertAPI.updateAlertRule(options.ruleId, updates);
        setRule(updated);
        return updated;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to update alert rule");
      }
    },
    [options.ruleId],
  );
  const toggleEnabled = useCallback(async () => {
    if (!rule) return;
    try {
      const updated = await alertAPI.toggleAlertRuleEnabled(
        options.ruleId,
        !rule.enabled,
      );
      setRule(updated);
      return updated;
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error("Failed to toggle alert rule");
    }
  }, [options.ruleId, rule]);
  return { rule, loading, error, updateRule, toggleEnabled };
}
interface UseAlertSummaryOptions {
  organizationId: string;
  outletId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useAlertSummary(options: UseAlertSummaryOptions) {
  const [summary, setSummary] = useState<{
    total_open: number;
    total_acknowledged: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    unresolved_critical: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await alertAPI.getAlertSummary(
        options.organizationId,
        options.outletId,
      );
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch alert summary"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId]);
  useEffect(() => {
    fetchSummary();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchSummary,
        (options.refreshInterval || 60) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchSummary, options.autoRefresh, options.refreshInterval]);
  return { summary, loading, error, refetch: fetchSummary };
}
