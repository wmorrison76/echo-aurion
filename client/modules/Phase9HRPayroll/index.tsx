import React from "react";

import { Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { useI18n } from "@/i18n";

import BenefitsPage from "./BenefitsPage";
import DashboardPage from "./DashboardPage";
import EmployeesPage from "./EmployeesPage";
import PayrollPage from "./PayrollPage";
import SchedulingPage from "./SchedulingPage";
import TrainingPage from "./TrainingPage";
import { fetchHRMetrics } from "./api";

type PageId =
  | "dashboard"
  | "employees"
  | "scheduling"
  | "payroll"
  | "benefits"
  | "training";

export interface Phase9HRPayrollPanelProps {
  panelId?: string;
  onDelete?: () => void;
  compact?: boolean;
  initialPage?: PageId;
  outletId?: string;
  payrollRunId?: string;
}

function NavButton(props: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const { active, label, onClick } = props;
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors",
        active
          ? "bg-green-500/20 text-green-300"
          : "text-muted-foreground hover:text-foreground hover:bg-surface/60",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function Phase9HRPayrollPanel(props: Phase9HRPayrollPanelProps) {
  const { t } = useI18n();
  const {
    onDelete,
    compact = false,
    initialPage,
    outletId,
    payrollRunId,
  } = props;

  const [currentPage, setCurrentPage] = React.useState<PageId>(
    () => initialPage || "dashboard",
  );
  const [compactSummary, setCompactSummary] = React.useState<{
    totalEmployees: number;
    activeEmployees: number;
    turnoverRate: number;
    certificationRate: number;
  } | null>(null);

  React.useEffect(() => {
    if (initialPage) setCurrentPage(initialPage);
  }, [initialPage]);

  React.useEffect(() => {
    if (!compact) return;
    let cancelled = false;
    fetchHRMetrics(outletId)
      .then((m) => {
        if (cancelled) return;
        setCompactSummary({
          totalEmployees: m.totalEmployees,
          activeEmployees: m.activeEmployees,
          turnoverRate: m.turnoverRate,
          certificationRate: m.certificationRate,
        });
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : String(err)),
      );
    return () => {
      cancelled = true;
    };
  }, [compact, outletId]);

  const page = React.useMemo(() => {
    switch (currentPage) {
      case "employees":
        return <EmployeesPage outletId={outletId} />;
      case "scheduling":
        return <SchedulingPage outletId={outletId} />;
      case "payroll":
        return <PayrollPage outletId={outletId} payrollRunId={payrollRunId} />;
      case "benefits":
        return <BenefitsPage outletId={outletId} />;
      case "training":
        return <TrainingPage outletId={outletId} />;
      case "dashboard":
      default:
        return <DashboardPage outletId={outletId} />;
    }
  }, [currentPage, outletId, payrollRunId]);

  if (compact) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        <div className="flex-shrink-0 border-b border-border/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            <h3 className="text-sm font-semibold">
              {t("module.hr-payroll.title")}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <ModuleChatButton
              moduleId="hr-payroll"
              moduleName={t("module.hr-payroll.title")}
            />
            {onDelete ? (
              <button
                onClick={onDelete}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Close"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="p-3 rounded-lg bg-surface/50 border border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Employees</span>
              <span className="text-sm font-semibold">
                {compactSummary ? compactSummary.totalEmployees : "–"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Active: {compactSummary ? compactSummary.activeEmployees : "–"}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface/50 border border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Turnover</span>
              <span className="text-sm font-semibold">
                {compactSummary ? `${compactSummary.turnoverRate}%` : "–"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Certification:{" "}
              {compactSummary ? `${compactSummary.certificationRate}%` : "–"}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setCurrentPage("payroll")}
          >
            Open payroll
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/15 border border-green-500/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("module.hr-payroll.title")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("module.hr-payroll.description")}
              {outletId || payrollRunId ? (
                <>
                  {" "}
                  •{outletId ? ` Outlet: ${outletId}` : ""}
                  {payrollRunId ? ` • Run: ${payrollRunId}` : ""}
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModuleChatButton
            moduleId="hr-payroll"
            moduleName={t("module.hr-payroll.title")}
          />
          {onDelete ? (
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Close panel"
              aria-label="Close"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border/30 px-4 py-2 bg-surface/30 flex gap-1 overflow-x-auto">
        <NavButton
          active={currentPage === "dashboard"}
          label={t("module.hr-payroll.nav.dashboard")}
          onClick={() => setCurrentPage("dashboard")}
        />
        <NavButton
          active={currentPage === "employees"}
          label={t("module.hr-payroll.nav.employees")}
          onClick={() => setCurrentPage("employees")}
        />
        <NavButton
          active={currentPage === "scheduling"}
          label={t("module.hr-payroll.nav.scheduling")}
          onClick={() => setCurrentPage("scheduling")}
        />
        <NavButton
          active={currentPage === "payroll"}
          label={t("module.hr-payroll.nav.payroll")}
          onClick={() => setCurrentPage("payroll")}
        />
        <NavButton
          active={currentPage === "benefits"}
          label={t("module.hr-payroll.nav.benefits")}
          onClick={() => setCurrentPage("benefits")}
        />
        <NavButton
          active={currentPage === "training"}
          label={t("module.hr-payroll.nav.training")}
          onClick={() => setCurrentPage("training")}
        />
        {outletId ? (
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">Outlet: {outletId}</Badge>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto">{page}</div>
    </div>
  );
}
