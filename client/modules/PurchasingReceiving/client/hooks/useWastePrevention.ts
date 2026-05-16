/** * useWastePrevention - React hooks for prevention actions and ROI * Handles prevention tracking and ROI calculations */ import {
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  WastePreventionAction,
  WastePreventionROI,
  WasteReport,
} from "@shared/types/waste";
import * as preventionAPI from "@shared/api/waste-prevention";
interface UsePreventionActionsOptions {
  organizationId: string;
  outletId?: string;
  status?: "proposed" | "approved" | "in_progress" | "completed" | "cancelled";
}
export function usePreventionActions(options: UsePreventionActionsOptions) {
  const [actions, setActions] = useState<WastePreventionAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await preventionAPI.getPreventionActions(
          options.organizationId,
          { outletId: options.outletId, status: options.status },
        );
        setActions(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch prevention actions"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.organizationId, options.outletId, options.status]);
  const createAction = useCallback(
    async (
      action: Omit<WastePreventionAction, "id" | "created_at" | "updated_at">,
    ) => {
      try {
        const newAction = await preventionAPI.createPreventionAction(action);
        setActions([...actions, newAction]);
        return newAction;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to create action");
      }
    },
    [actions],
  );
  const summary = {
    total: actions.length,
    proposed: actions.filter((a) => a.status === "proposed").length,
    inProgress: actions.filter((a) => a.status === "in_progress").length,
    completed: actions.filter((a) => a.status === "completed").length,
    totalExpectedSavings: actions.reduce(
      (sum, a) => sum + (a.expected_cost_savings || 0),
      0,
    ),
  };
  return { actions, loading, error, createAction, summary };
}
interface UsePreventionROIOptions {
  organizationId: string;
  outletId?: string;
}
export function usePreventionROI(options: UsePreventionROIOptions) {
  const [roiData, setROIData] = useState<WastePreventionROI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await preventionAPI.getPreventionROI(
          options.organizationId,
          { outletId: options.outletId, completed: true },
        );
        setROIData(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch prevention ROI"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.organizationId, options.outletId]);
  const summary = {
    total: roiData.length,
    totalInvestment: roiData.reduce(
      (sum, r) => sum + (r.total_investment || 0),
      0,
    ),
    totalSavings: roiData.reduce((sum, r) => sum + (r.total_savings || 0), 0),
    avgROI:
      roiData.length > 0
        ? roiData.reduce((sum, r) => sum + (r.roi_percentage || 0), 0) /
          roiData.length
        : 0,
  };
  const netBenefit = summary.totalSavings - summary.totalInvestment;
  return {
    roiData,
    loading,
    error,
    summary: {
      ...summary,
      netBenefit,
      roi_payback_months:
        summary.totalSavings > 0
          ? (summary.totalInvestment / summary.totalSavings) * 12
          : 0,
    },
  };
}
interface UseWasteReportsOptions {
  organizationId: string;
  outletId?: string;
  limit?: number;
}
export function useWasteReports(options: UseWasteReportsOptions) {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await preventionAPI.getWasteReports(
          options.organizationId,
          { outletId: options.outletId },
        );
        setReports(data.slice(0, options.limit || 10));
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch waste reports"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.organizationId, options.outletId, options.limit]);
  const generateReport = useCallback(
    async (reportType: string, periodStart: string, periodEnd: string) => {
      try {
        const newReport = await preventionAPI.generateWasteReport(
          options.organizationId,
          {
            reportType: reportType as any,
            periodStart,
            periodEnd,
            outletId: options.outletId,
          },
        );
        setReports([newReport, ...reports]);
        return newReport;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to generate report");
      }
    },
    [options.organizationId, options.outletId, reports],
  );
  return {
    reports,
    loading,
    error,
    generateReport,
    latestReport: reports.length > 0 ? reports[0] : null,
  };
}
interface UseSupplierWasteImpactOptions {
  organizationId: string;
  limit?: number;
}
export function useSupplierWasteImpact(options: UseSupplierWasteImpactOptions) {
  const [suppliers, setSuppliers] = useState<
    {
      supplier_id: string;
      total_waste_cost: number;
      waste_incidents_count: number;
      supplier_quality_score?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await preventionAPI.getWorstSuppliers(
          options.organizationId,
          options.limit || 10,
        );
        setSuppliers(data as any);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch supplier waste impact"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.organizationId, options.limit]);
  return {
    suppliers,
    loading,
    error,
    worstSupplier: suppliers.length > 0 ? suppliers[0] : null,
  };
}
