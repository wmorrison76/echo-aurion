/** * usePnLAlerts Hook * Monitor and manage P&L variance alerts */ import {
  useState,
  useCallback,
  useMemo,
} from "react";
import { DetailedPnL } from "@/shared/types/pnlTypes";
export interface PnLAlert {
  id: string;
  propertyId: string;
  type: "variance" | "threshold" | "anomaly" | "trend";
  severity: "critical" | "warning" | "info";
  lineItemId: string;
  lineItemName: string;
  message: string;
  actualValue: number;
  budgetValue?: number;
  threshold?: number;
  variancePercent?: number;
  createdAt: string;
  acknowledgedAt?: string;
  isActive: boolean;
}
interface AlertRule {
  id: string;
  lineItemId?: string;
  type: "variance_percent" | "absolute_amount" | "trend_change";
  operator: ">" | "<" | "=" | "!=" | ">=" | "<=";
  threshold: number;
  severity: "critical" | "warning" | "info";
  enabled: boolean;
}
export function usePnLAlerts(pnl?: DetailedPnL) {
  const [alerts, setAlerts] = useState<PnLAlert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(
    new Set(),
  ); // Calculate alerts based on P&L data const calculatedAlerts = useMemo(() => { if (!pnl) return []; const newAlerts: PnLAlert[] = []; const checkVariance = ( lineItemId: string, lineItemName: string, actual: number, budget?: number ) => { if (budget === undefined) return; const variance = actual - budget; const variancePercent = (variance / budget) * 100; // Critical variance (>20%) if (Math.abs(variancePercent) > 20) { newAlerts.push({ id: `alert-${lineItemId}-critical`, propertyId: pnl.propertyId, type:"variance", severity:"critical", lineItemId, lineItemName, message: `${lineItemName} variance is ${Math.abs(variancePercent).toFixed(1)}% (${actual > budget ?"over" :"under"} budget)`, actualValue: actual, budgetValue: budget, variancePercent, createdAt: new Date().toISOString(), isActive: true, }); } // Warning variance (5-20%) else if (Math.abs(variancePercent) > 5) { newAlerts.push({ id: `alert-${lineItemId}-warning`, propertyId: pnl.propertyId, type:"variance", severity:"warning", lineItemId, lineItemName, message: `${lineItemName} variance is ${Math.abs(variancePercent).toFixed(1)}% (${actual > budget ?"over" :"under"} budget)`, actualValue: actual, budgetValue: budget, variancePercent, createdAt: new Date().toISOString(), isActive: true, }); } }; // Check line items pnl.sections.forEach((section) => { section.lineItems.forEach((item) => { const actual = item.variance?.budgetAmount || 0; const budget = item.variance?.budgetAmount; checkVariance(item.id, item.name, actual, budget); }); }); // Check key metrics checkVariance("revenue","Total Revenue", pnl.totalRevenue); checkVariance("gross-profit","Gross Profit", pnl.grossProfit); checkVariance("operating-income","Operating Income", pnl.operatingIncome); return newAlerts; }, [pnl]); const activeAlerts = useMemo( () => calculatedAlerts .filter((a) => !acknowledgedAlerts.has(a.id)) .sort((a, b) => { const severityOrder = { critical: 0, warning: 1, info: 2 }; return ( severityOrder[a.severity] - severityOrder[b.severity] ); }), [calculatedAlerts, acknowledgedAlerts] ); const acknowledgeAlert = useCallback((alertId: string) => { setAcknowledgedAlerts((prev) => new Set(prev).add(alertId)); }, []); const acknowledgeAll = useCallback(() => { const allIds = new Set(calculatedAlerts.map((a) => a.id)); setAcknowledgedAlerts(allIds); }, [calculatedAlerts]); const createAlertRule = useCallback((rule: AlertRule) => { setAlertRules((prev) => [...prev, rule]); // TODO: Save to API }, []); const deleteAlertRule = useCallback((ruleId: string) => { setAlertRules((prev) => prev.filter((r) => r.id !== ruleId)); // TODO: Delete from API }, []); const updateAlertRule = useCallback((ruleId: string, updates: Partial<AlertRule>) => { setAlertRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)) ); // TODO: Update in API }, []); const getAlertSummary = useMemo(() => { return { total: calculatedAlerts.length, critical: calculatedAlerts.filter((a) => a.severity ==="critical").length, warning: calculatedAlerts.filter((a) => a.severity ==="warning").length, info: calculatedAlerts.filter((a) => a.severity ==="info").length, acknowledged: acknowledgedAlerts.size, active: activeAlerts.length, }; }, [calculatedAlerts, acknowledgedAlerts, activeAlerts]); return { alerts: calculatedAlerts, activeAlerts, alertRules, acknowledgedAlerts, alertSummary: getAlertSummary, acknowledgeAlert, acknowledgeAll, createAlertRule, deleteAlertRule, updateAlertRule, };
}
