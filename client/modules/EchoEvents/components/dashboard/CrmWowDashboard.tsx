import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { get } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { openPanel } from "@/lib/open-panel";
import { DashboardControls, DashboardWorkspace } from "./DashboardWorkspace";
import { NextActionSlaWidget } from "./widgets/NextActionSlaWidget";
import { StageVelocityWidget } from "./widgets/StageVelocityWidget";
import { ManagerScorecardWidget } from "./widgets/ManagerScorecardWidget";
import { CadenceComplianceWidget } from "./widgets/CadenceComplianceWidget";
import { ProfitabilityForecastWidget } from "./widgets/ProfitabilityForecastWidget";
import { CommissionMiniPanel } from "./widgets/CommissionMiniPanel";

type NextActionSummary = { total: number; overdue: number; due: number };
type StageVelocitySummary = { stalled: number; stallDays: number };
type Scorecard = {
  managerId: string;
  openPipelineValue: number;
  weightedPipelineValue: number;
  closeRate: number;
  overdueActions: number;
  stalledDeals: number;
};

type CommissionSummary = {
  totalRevenue: number;
  totalCommission: number;
  entries: Array<{ eventId: string }>;
};

export default function CrmWowDashboard() {
  const [nextActions, setNextActions] = useState<NextActionSummary>({
    total: 0,
    overdue: 0,
    due: 0,
  });
  const [velocitySummary, setVelocitySummary] = useState<StageVelocitySummary>({
    stalled: 0,
    stallDays: 14,
  });
  const [velocityAvg, setVelocityAvg] = useState(0);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [cadence, setCadence] = useState({
    compliancePct: 0,
    cadenceDays: 7,
    total: 0,
  });
  const [profitability, setProfitability] = useState({
    avgMarginPct: 0,
    totalRevenue: 0,
    totalCogs: 0,
  });
  const [commission, setCommission] = useState<CommissionSummary>({
    totalRevenue: 0,
    totalCommission: 0,
    entries: [],
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      const [
        actionsRes,
        velocityRes,
        scorecardRes,
        cadenceRes,
        profitabilityRes,
        commissionRes,
      ] = await Promise.all([
        get<any>("/api/echoevents/crm/next-actions"),
        get<any>("/api/echoevents/crm/stage-velocity"),
        get<any>("/api/echoevents/crm/scorecards"),
        get<any>("/api/echoevents/crm/cadence"),
        get<any>("/api/echoevents/crm/profitability"),
        get<any>(
          `/api/echoevents/crm/commission/summary?start=${start}&end=${end}`,
        ),
      ]);

      setNextActions(
        actionsRes?.data?.summary || { total: 0, overdue: 0, due: 0 },
      );
      setVelocitySummary(
        velocityRes?.data?.summary || { stalled: 0, stallDays: 14 },
      );
      const entries = velocityRes?.data?.entries || [];
      const avgDays =
        entries.length > 0
          ? entries.reduce(
              (sum: number, e: any) => sum + Number(e.daysInStage || 0),
              0,
            ) / entries.length
          : 0;
      setVelocityAvg(avgDays);
      setScorecards(Array.isArray(scorecardRes?.data) ? scorecardRes.data : []);

      const cadenceItems = Array.isArray(cadenceRes?.data)
        ? cadenceRes.data
        : [];
      const compliant = cadenceItems.filter((c: any) => c.isCompliant).length;
      setCadence({
        compliancePct: cadenceItems.length
          ? (compliant / cadenceItems.length) * 100
          : 0,
        cadenceDays: cadenceItems[0]?.cadenceDays || 7,
        total: cadenceItems.length,
      });

      const profitabilityItems = Array.isArray(profitabilityRes?.data)
        ? profitabilityRes.data
        : [];
      const totalRevenue = profitabilityItems.reduce(
        (sum: number, item: any) => sum + Number(item.revenueForecast || 0),
        0,
      );
      const totalCogs = profitabilityItems.reduce(
        (sum: number, item: any) => sum + Number(item.cogsForecast || 0),
        0,
      );
      const avgMarginPct =
        profitabilityItems.length > 0
          ? profitabilityItems.reduce(
              (sum: number, item: any) => sum + Number(item.marginPct || 0),
              0,
            ) / profitabilityItems.length
          : 0;
      setProfitability({ avgMarginPct, totalRevenue, totalCogs });

      setCommission({
        totalRevenue: commissionRes?.data?.totalRevenue || 0,
        totalCommission: commissionRes?.data?.totalCommission || 0,
        entries: commissionRes?.data?.entries || [],
      });
    } catch {
      setNextActions({ total: 0, overdue: 0, due: 0 });
      setVelocitySummary({ stalled: 0, stallDays: 14 });
      setVelocityAvg(0);
      setScorecards([]);
      setCadence({ compliancePct: 0, cadenceDays: 7, total: 0 });
      setProfitability({ avgMarginPct: 0, totalRevenue: 0, totalCogs: 0 });
      setCommission({ totalRevenue: 0, totalCommission: 0, entries: [] });
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const openDetail = useCallback((panel: string) => {
    openPanel("echo-events", undefined, {
      initialView: "crm",
      detailPanel: panel,
    });
  }, []);

  const clickable = useCallback(
    (panel: string, children: ReactNode) => (
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer transition hover:-translate-y-0.5"
        onClick={() => openDetail(panel)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetail(panel);
          }
        }}
      >
        {children}
      </div>
    ),
    [openDetail],
  );

  const bannerAlerts = useMemo(
    () => [
      {
        id: "overdue",
        label: "Overdue Actions",
        value: nextActions.overdue,
        icon: ShieldAlert,
        tone: "text-amber-500",
        panel: "next-actions",
      },
      {
        id: "stalled",
        label: "Stalled Deals",
        value: velocitySummary.stalled,
        icon: TimerReset,
        tone: "text-red-500",
        panel: "stage-velocity",
      },
      {
        id: "margin",
        label: "Margin Risk",
        value: profitability.avgMarginPct < 0.2 ? 1 : 0,
        icon: AlertTriangle,
        tone: "text-red-500",
        panel: "profitability",
      },
    ],
    [nextActions.overdue, velocitySummary.stalled, profitability.avgMarginPct],
  );

  const widgets = [
    {
      id: "next-action-sla",
      title: "Next‑Action SLA",
      icon: Sparkles,
      layoutClass: "xl:col-span-4",
      render: () =>
        clickable(
          "next-actions",
          <NextActionSlaWidget summary={nextActions} />,
        ),
    },
    {
      id: "stage-velocity",
      title: "Stage Velocity",
      icon: Sparkles,
      layoutClass: "xl:col-span-4",
      render: () =>
        clickable(
          "stage-velocity",
          <StageVelocityWidget
            stalled={velocitySummary.stalled}
            stallDays={velocitySummary.stallDays}
            averageDays={velocityAvg}
          />,
        ),
    },
    {
      id: "manager-scorecards",
      title: "Manager Scorecards",
      icon: Sparkles,
      layoutClass: "xl:col-span-4",
      render: () =>
        clickable(
          "scorecards",
          <ManagerScorecardWidget managers={scorecards} />,
        ),
    },
    {
      id: "cadence",
      title: "Cadence Compliance",
      icon: Sparkles,
      layoutClass: "xl:col-span-4",
      render: () =>
        clickable(
          "cadence",
          <CadenceComplianceWidget
            compliancePct={cadence.compliancePct}
            cadenceDays={cadence.cadenceDays}
            total={cadence.total}
          />,
        ),
    },
    {
      id: "profitability",
      title: "Profitability",
      icon: Sparkles,
      layoutClass: "xl:col-span-4",
      render: () =>
        clickable(
          "profitability",
          <ProfitabilityForecastWidget
            avgMarginPct={profitability.avgMarginPct}
            totalRevenue={profitability.totalRevenue}
            totalCogs={profitability.totalCogs}
          />,
        ),
    },
    {
      id: "commission",
      title: "Commission",
      icon: Sparkles,
      layoutClass: "xl:col-span-4",
      render: () =>
        clickable(
          "commission",
          <CommissionMiniPanel
            totalRevenue={commission.totalRevenue}
            totalCommission={commission.totalCommission}
            entryCount={commission.entries.length}
          />,
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <DashboardWorkspace widgets={widgets}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/70 p-4">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Sales Command Center
            </div>
            <div className="text-xs text-muted-foreground">
              Live pipeline health, action SLA, and profitability signals.
            </div>
          </div>
          <DashboardControls />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {bannerAlerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Card
                key={alert.id}
                className="border-border/40 bg-gradient-to-br from-background to-background/60"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${alert.tone}`} />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {alert.label}
                      </div>
                      <div className="text-lg font-semibold">{alert.value}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetail(alert.panel)}
                  >
                    Review
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DashboardWorkspace>
    </div>
  );
}
