import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  FileText,
} from "lucide-react";
import { useTenancy, type Tenancy } from "../../hooks/useTenancy";
import {
  findReportMatch,
  REPORT_DESTINATION_LABELS,
  REPORTS,
  REPORT_STATUS_LABELS,
  REPORT_TIER_LABELS,
  reportMatchesQuery,
  type ReportDestination,
  type ReportStatus,
  type ReportTier,
  type ScheduleReportItem,
} from "./ReportCatalog";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenDestination: (destination: ReportDestination) => void;
  weekStartISO: string;
}

const TIER_FILTERS: Array<ReportTier | "all"> = ["all", 1, 2, 3, 4, 5];
const STATUS_FILTERS: Array<ReportStatus | "all"> = ["all", "ready", "partial", "planned"];
const CSV_REPORT_IDS = new Set(["payroll-register", "tip-runs", "pnl-lite"]);

function statusClass(status: ReportStatus) {
  if (status === "ready") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  if (status === "partial") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-slate-500/40 bg-slate-500/10 text-slate-300";
}

function statusCopy(status: ReportStatus) {
  if (status === "ready") return "Ready to run";
  if (status === "partial") return "Partially wired";
  return "Modeled only";
}

function reportDataUrl(report: ScheduleReportItem, tenancy: Tenancy, weekStartISO: string) {
  const params = new URLSearchParams();
  if (tenancy.org_id) params.set("org_id", tenancy.org_id);
  if (tenancy.outlet_id) params.set("outlet_id", tenancy.outlet_id);
  if (tenancy.dept_id) params.set("dept_id", tenancy.dept_id);
  params.set("week_start", weekStartISO);
  return `/api/reports/run?reportId=${encodeURIComponent(report.id)}&${params.toString()}`;
}

function csvDownloadUrl(reportId: string, tenancy: Tenancy, weekStartISO: string) {
  const endISO = new Date(new Date(weekStartISO).getTime() + 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (reportId === "payroll-register") {
    const params = new URLSearchParams({
      outlet_id: tenancy.outlet_id,
      dept_id: tenancy.dept_id,
      week_start: weekStartISO,
    });
    return {
      url: `/api/reports/payroll?${params.toString()}`,
      filename: `payroll_${weekStartISO}.csv`,
    };
  }

  if (reportId === "tip-runs") {
    const params = new URLSearchParams({
      dept_id: tenancy.dept_id,
      start: weekStartISO,
      end: endISO,
    });
    return {
      url: `/api/reports/tips?${params.toString()}`,
      filename: `tips_${weekStartISO}_${endISO}.csv`,
    };
  }

  const params = new URLSearchParams({
    org_id: tenancy.org_id,
    week_start: weekStartISO,
  });
  return {
    url: `/api/reports/pnl-lite?${params.toString()}`,
    filename: `pnl_${weekStartISO}.csv`,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function stringifyData(data: unknown) {
  if (data == null) return "No data returned.";
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

function ResultPanel({ payload }: { payload: unknown }) {
  const body = stringifyData(payload);
  return (
    <pre className="max-h-[28rem] overflow-auto rounded-2xl border bg-muted/20 p-4 text-xs leading-5 text-foreground/85">
      {body}
    </pre>
  );
}

function ReportCard({
  report,
  active,
  onSelect,
}: {
  report: ScheduleReportItem;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(report.id)}
      className={`text-left rounded-2xl border p-4 transition hover:border-primary/40 hover:bg-accent/40 ${active ? "border-primary/50 bg-primary/10" : "border-border/60 bg-background/60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{report.title}</div>
          <div className="text-xs text-muted-foreground">{report.topic}</div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass(report.status)}`}>
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{report.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full border border-border/60 px-2 py-0.5">{REPORT_TIER_LABELS[report.tier]}</span>
        <span className="rounded-full border border-border/60 px-2 py-0.5">{REPORT_DESTINATION_LABELS[report.destination]}</span>
      </div>
    </button>
  );
}

export default function ScheduleReportsHub({
  query,
  onQueryChange,
  onOpenDestination,
  weekStartISO,
}: Props) {
  const { tenancy, loading: tenancyLoading } = useTenancy();
  const [catalogReports, setCatalogReports] = useState<ScheduleReportItem[]>(REPORTS);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<ReportTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<unknown>(null);
  const [runNote, setRunNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const response = await fetch("/api/reports/catalog");
        if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
        const data = (await response.json()) as { reports?: ScheduleReportItem[] };
        if (!cancelled && Array.isArray(data.reports) && data.reports.length > 0) {
          setCatalogReports(data.reports);
        }
      } catch {
        if (!cancelled) setCatalogReports(REPORTS);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const reports = catalogReports.length > 0 ? catalogReports : REPORTS;

  const visibleReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesQuery = reportMatchesQuery(report, query);
      const matchesTier = tierFilter === "all" || report.tier === tierFilter;
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      return matchesQuery && matchesTier && matchesStatus;
    });
  }, [reports, query, tierFilter, statusFilter]);

  useEffect(() => {
    if (!visibleReports.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleReports.some((report) => report.id === selectedId)) {
      setSelectedId(visibleReports[0].id);
    }
  }, [selectedId, visibleReports]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? visibleReports[0] ?? null,
    [reports, selectedId, visibleReports],
  );

  const matchedReport = useMemo(() => findReportMatch(query), [query]);

  const quickLinks = useMemo(
    () => reports.filter((report) => report.tier === 1 && report.status !== "planned").slice(0, 4),
    [reports],
  );

  const readyCount = reports.filter((report) => report.status === "ready").length;
  const partialCount = reports.filter((report) => report.status === "partial").length;
  const plannedCount = reports.filter((report) => report.status === "planned").length;
  const modeledReports = reports.filter((report) => report.status === "planned");
  const hasTenancy = Boolean(tenancy.org_id && tenancy.outlet_id && tenancy.dept_id);
  const canRunReports = hasTenancy && !tenancyLoading;

  async function runSelectedReport(report: ScheduleReportItem) {
    setRunError(null);
    setRunNote(null);

    if (report.status === "planned") {
      setRunResult({
        reportId: report.id,
        title: report.title,
        modeledOnly: true,
        status: report.status,
        destination: report.destination,
        notes: report.notes,
        sourceNeeds: report.sourceNeeds ?? [],
      });
      setRunNote("Modeled only. Add the missing source data before wiring a live run.");
      return;
    }

    if (CSV_REPORT_IDS.has(report.id)) {
      try {
        setRunningId(report.id);
        const { url, filename } = csvDownloadUrl(report.id, tenancy, weekStartISO);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Download failed (${response.status})`);
        }
        const blob = await response.blob();
        downloadBlob(blob, filename);
        setRunResult({
          reportId: report.id,
          title: report.title,
          downloaded: true,
          filename,
        });
        setRunNote(`Downloaded ${filename}`);
      } catch (error) {
        setRunError(error instanceof Error ? error.message : "Unable to download report");
      } finally {
        setRunningId(null);
      }
      return;
    }

    try {
      setRunningId(report.id);
      const response = await fetch(reportDataUrl(report, tenancy, weekStartISO));
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `Run failed (${response.status})`);
      }
      setRunResult(payload);
      setRunNote(`Ran ${report.title}`);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Unable to run report");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <div className="space-y-4">
        <Card className="border-border/60 bg-background/70 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Reports Hub
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search by topic, filter by tier, and run or export the matching report.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 px-3 py-1">{readyCount} ready</span>
                <span className="rounded-full border border-border/60 px-3 py-1">{partialCount} partial</span>
                <span className="rounded-full border border-border/60 px-3 py-1">{plannedCount} planned</span>
                <span className="rounded-full border border-border/60 px-3 py-1">
                  {catalogLoading ? "Loading catalog..." : "Catalog ready"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Search by topic, example: overtime, forecast, PTO, compliance"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" className="gap-2" onClick={() => onOpenDestination("reports")}> 
                <SlidersHorizontal className="h-4 w-4" />
                Open hub
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {TIER_FILTERS.map((tier) => (
                <Button
                  key={String(tier)}
                  size="sm"
                  variant={tierFilter === tier ? "default" : "outline"}
                  onClick={() => setTierFilter(tier)}
                  className="text-xs"
                >
                  {tier === "all" ? "All tiers" : REPORT_TIER_LABELS[tier]}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((status) => (
                <Button
                  key={String(status)}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                  className="text-xs"
                >
                  {status === "all" ? "All statuses" : REPORT_STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick links
              </div>
              <div className="flex flex-wrap gap-2">
                {quickLinks.map((report) => (
                  <Button
                    key={report.id}
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSelectedId(report.id);
                      onOpenDestination(report.destination);
                    }}
                  >
                    {report.title}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>

            {matchedReport && query.trim() ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary-foreground/90">
                <div className="font-medium text-primary">Best match for “{query.trim()}”</div>
                <div className="mt-1 text-sm text-foreground/80">
                  {matchedReport.title} · {matchedReport.notes}
                </div>
              </div>
            ) : null}

            {modeledReports.length ? (
              <div className="rounded-2xl border border-dashed border-slate-500/40 bg-slate-500/8 p-4 text-sm">
                <div className="font-medium text-foreground">Modeled-only reports</div>
                <p className="mt-1 text-muted-foreground">
                  These are intentionally modeled without a live run until the new source data is connected.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {modeledReports.map((report) => (
                    <Button
                      key={report.id}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedId(report.id);
                        onOpenDestination(report.destination);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {report.title}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  active={selectedId === report.id}
                  onSelect={setSelectedId}
                />
              ))}
            </div>

            {!visibleReports.length ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                No reports match the current search and filters.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-background/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Report details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedReport ? (
            <>
              <div>
                <div className="text-2xl font-semibold">{selectedReport.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{selectedReport.description}</div>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-muted-foreground">Tier</span>
                  <span>{REPORT_TIER_LABELS[selectedReport.tier]}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span>{REPORT_STATUS_LABELS[selectedReport.status]}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-muted-foreground">Destination</span>
                  <span>{REPORT_DESTINATION_LABELS[selectedReport.destination]}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-muted-foreground">Ready state</span>
                  <span>{statusCopy(selectedReport.status)}</span>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                {selectedReport.notes}
              </div>

              {selectedReport.status === "planned" ? (
                <div className="rounded-2xl border border-dashed border-slate-500/40 bg-slate-500/10 p-4 text-sm text-muted-foreground">
                  This report is modeled only. Keep the live run disabled until the missing source data lands.
                </div>
              ) : null}

              {selectedReport.sourceNeeds?.length ? (
                <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-50">
                  <div className="font-medium text-amber-100">Source data needed</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-50/90">
                    {selectedReport.sourceNeeds.map((need) => (
                      <li key={need}>{need}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  How to use
                </div>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Open the destination page from the sidebar.</li>
                  <li>Run the report against the active week and tenancy.</li>
                  <li>Print or export the result from this panel.</li>
                </ol>
              </div>

              {!canRunReports ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Tenancy is not fully loaded yet. Reports will run once organization, outlet, and department are available.
                </div>
              ) : null}

              {runNote ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  {runNote}
                </div>
              ) : null}

              {runError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {runError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  className="gap-2"
                  onClick={() => void runSelectedReport(selectedReport)}
                  disabled={
                    runningId === selectedReport.id ||
                    (selectedReport.status !== "planned" && !canRunReports)
                  }
                >
                  {runningId === selectedReport.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedReport.status === "planned" ? (
                    <FileText className="h-4 w-4" />
                  ) : CSV_REPORT_IDS.has(selectedReport.id) ? (
                    <Download className="h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {selectedReport.status === "planned"
                    ? "View model"
                    : CSV_REPORT_IDS.has(selectedReport.id)
                      ? "Download CSV"
                      : "Run report"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenDestination(selectedReport.destination)}
                >
                  Open {REPORT_DESTINATION_LABELS[selectedReport.destination]}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  disabled={!runResult}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print result
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRunResult(null);
                    setRunError(null);
                    setRunNote(null);
                  }}
                >
                  Clear output
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{selectedReport.status === "planned" ? "Model output" : "Last run output"}</span>
                  <span>{selectedReport.id}</span>
                </div>
                {runResult ? (
                  <ResultPanel payload={runResult} />
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    {selectedReport.status === "planned"
                      ? "View the model to see its dependency summary here."
                      : "Run this report to see output here."}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              No report selected.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
