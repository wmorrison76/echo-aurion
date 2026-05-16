/*** * LUCCCA — BUILD 33 & BUILD 34 * Executive Command Console * * PURPOSE: * - High-level KPI cockpit for EC / GM * - Summarizes operations, risk, and conflicts at a glance * - Accepts navigation callbacks for drill-down (BUILD 34) ***/ import React, {
  useEffect,
  useState,
} from "react";
type ExecSummary = {
  date: string;
  totalEvents: number;
  totalHeadcount: number;
  estRevenue: number;
  totalLaborHours: number;
  riskCounts: { low: number; medium: number; high: number };
  conflictsOpen: number;
};
type ExecCommandConsoleProps = {
  onOpenMaestro?: () => void;
  onOpenGlobalCalendar?: () => void;
  onOpenConflictDashboard?: () => void;
  onOpenAuditTimeline?: () => void;
  onFilterHighRiskEvents?: () => void;
};
export default function ExecCommandConsole(props: ExecCommandConsoleProps) {
  const [summary, setSummary] = useState<ExecSummary | null>(null);
  useEffect(() => {
    async function load() {
      const mock: ExecSummary = {
        date: new Date().toISOString().slice(0, 10),
        totalEvents: 7,
        totalHeadcount: 840,
        estRevenue: 185000,
        totalLaborHours: 420,
        riskCounts: { low: 3, medium: 3, high: 1 },
        conflictsOpen: 2,
      };
      setSummary(mock);
    }
    load();
  }, []);
  if (!summary) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {" "}
        Loading Executive Command Console...{" "}
      </div>
    );
  }
  const { riskCounts } = summary;
  return (
    <div className="p-4 w-[720px] h-full overflow-y-auto font-sans bg-background space-y-4">
      {" "}
      <header className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-xl font-semibold">
            {" "}
            Executive Command Console{" "}
          </h2>{" "}
          <p className="text-xs text-muted-foreground">
            {" "}
            Resort-wide operational snapshot for {summary.date}.{" "}
          </p>{" "}
        </div>{" "}
      </header>{" "}
      <section className="grid grid-cols-4 gap-3 text-sm">
        {" "}
        <KpiCard label="Events Today" value={summary.totalEvents} />{" "}
        <KpiCard label="Total Headcount" value={summary.totalHeadcount} />{" "}
        <KpiCard
          label="Est. Revenue"
          value={`$${summary.estRevenue.toLocaleString()}`}
        />{" "}
        <KpiCard
          label="Labor Hours"
          value={summary.totalLaborHours}
          mutedDetail="Forecast"
        />{" "}
      </section>{" "}
      <section className="grid grid-cols-3 gap-3 text-sm">
        {" "}
        <div className="border border-slate-200 rounded-lg p-3 bg-background">
          {" "}
          <h3 className="font-semibold text-foreground text-sm">
            {" "}
            Event Risk Distribution{" "}
          </h3>{" "}
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {" "}
            <RiskRow
              label="Low"
              value={riskCounts.low}
              color="text-emerald-600"
            />{" "}
            <RiskRow
              label="Medium"
              value={riskCounts.medium}
              color="text-amber-500"
            />{" "}
            <RiskRow
              label="High"
              value={riskCounts.high}
              color="text-red-600"
              onClick={props.onFilterHighRiskEvents}
            />{" "}
          </div>{" "}
          {props.onFilterHighRiskEvents && (
            <div className="mt-2 text-[10px] text-muted-foreground">
              {" "}
              Tip: Click"High" to filter calendar + conflicts to highest risk
              events.{" "}
            </div>
          )}{" "}
        </div>{" "}
        <div className="border border-slate-200 rounded-lg p-3 bg-background">
          {" "}
          <h3 className="font-semibold text-foreground text-sm">
            {" "}
            Open Conflicts{" "}
          </h3>{" "}
          <button
            className="mt-4 text-3xl font-bold text-red-600 w-full text-left hover:text-red-700"
            onClick={props.onOpenConflictDashboard}
          >
            {" "}
            {summary.conflictsOpen}{" "}
          </button>{" "}
          <div className="mt-1 text-xs text-muted-foreground">
            {" "}
            Items requiring attention in Override Center / Maestro BQT.{" "}
          </div>{" "}
        </div>{" "}
        <div className="border border-slate-200 rounded-lg p-3 bg-background">
          {" "}
          <h3 className="font-semibold text-foreground text-sm">
            {" "}
            Quick Actions{" "}
          </h3>{" "}
          <div className="mt-2 flex flex-col gap-2 text-xs">
            {" "}
            <QuickLink
              label="Open Maestro BQT"
              onClick={props.onOpenMaestro}
            />{" "}
            <QuickLink
              label="View Global Calendar"
              onClick={props.onOpenGlobalCalendar}
            />{" "}
            <QuickLink
              label="Conflict Dashboard"
              onClick={props.onOpenConflictDashboard}
            />{" "}
            <QuickLink
              label="Audit Timeline"
              onClick={props.onOpenAuditTimeline}
            />{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
    </div>
  );
}
function KpiCard({
  label,
  value,
  mutedDetail,
}: {
  label: string;
  value: string | number;
  mutedDetail?: string;
}) {
  return (
    <div className="border border-slate-200 rounded-lg px-3 py-2 bg-background">
      {" "}
      <div className="text-[11px] text-muted-foreground">{label}</div>{" "}
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>{" "}
      {mutedDetail && (
        <div className="text-[10px] text-slate-400 mt-1">{mutedDetail}</div>
      )}{" "}
    </div>
  );
}
function QuickLink({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="w-full text-left border border-slate-200 rounded-md px-2 py-1 hover:bg-slate-50 disabled:opacity-40 text-xs"
      onClick={onClick}
      disabled={!onClick}
    >
      {" "}
      {label}{" "}
    </button>
  );
}
function RiskRow({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="flex justify-between w-full px-1 py-0.5 rounded hover:bg-slate-50 text-left disabled:opacity-40"
      onClick={onClick}
      disabled={!onClick}
    >
      {" "}
      <span className={color}>{label}</span> <span>{value}</span>{" "}
    </button>
  );
}
