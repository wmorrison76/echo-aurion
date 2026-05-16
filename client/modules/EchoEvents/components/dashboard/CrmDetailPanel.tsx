import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  Gauge,
  Handshake,
  LineChart,
} from "lucide-react";
import { get } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PanelKind =
  | "next-actions"
  | "stage-velocity"
  | "scorecards"
  | "cadence"
  | "profitability"
  | "commission";

const PANEL_META: Record<
  PanelKind,
  { title: string; icon: JSX.Element; description: string }
> = {
  "next-actions": {
    title: "Next‑Action SLA Detail",
    icon: <CalendarClock className="h-4 w-4 text-primary" />,
    description: "Overdue and upcoming actions across the pipeline.",
  },
  "stage-velocity": {
    title: "Stage Velocity & Stall Alerts",
    icon: <Gauge className="h-4 w-4 text-primary" />,
    description: "Time‑in‑stage analysis with stall detection.",
  },
  scorecards: {
    title: "Sales Manager Scorecards",
    icon: <Handshake className="h-4 w-4 text-primary" />,
    description: "Manager performance, pipeline value, and health.",
  },
  cadence: {
    title: "Touch Cadence Compliance",
    icon: <ArrowLeftRight className="h-4 w-4 text-primary" />,
    description: "Follow‑up compliance across the full funnel.",
  },
  profitability: {
    title: "Deal Profitability Forecast",
    icon: <LineChart className="h-4 w-4 text-primary" />,
    description: "Revenue, COGS, margin signals for owners.",
  },
  commission: {
    title: "Commission Tracking",
    icon: <LineChart className="h-4 w-4 text-primary" />,
    description: "Commission totals and deal-level breakdowns.",
  },
};

export default function CrmDetailPanel({
  panel,
  onClose,
}: {
  panel: string;
  onClose?: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const kind = (panel as PanelKind) || "next-actions";

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      if (kind === "next-actions") {
        const res = await get<any>("/api/echoevents/crm/next-actions");
        setData(res?.data?.items || []);
        setSummary(res?.data?.summary || null);
      } else if (kind === "stage-velocity") {
        const res = await get<any>("/api/echoevents/crm/stage-velocity");
        setData(res?.data?.entries || []);
        setSummary(res?.data?.summary || null);
      } else if (kind === "scorecards") {
        const res = await get<any>("/api/echoevents/crm/scorecards");
        setData(res?.data || []);
      } else if (kind === "cadence") {
        const res = await get<any>("/api/echoevents/crm/cadence");
        setData(res?.data || []);
      } else if (kind === "profitability") {
        const res = await get<any>("/api/echoevents/crm/profitability");
        setData(res?.data || []);
      } else if (kind === "commission") {
        const res = await get<any>(
          `/api/echoevents/crm/commission/summary?start=${start}&end=${end}`,
        );
        setData(res?.data?.entries || []);
        setSummary(res?.data || null);
      }
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const meta = PANEL_META[kind];

  return (
    <Card className="glass-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {meta.icon}
            {meta.title}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {meta.description}
          </div>
        </div>
        {onClose ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {Object.entries(summary).map(([key, value]) => (
              <Badge key={key} variant="secondary">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {kind === "next-actions" && (
                  <>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </>
                )}
                {kind === "stage-velocity" && (
                  <>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Owner</TableHead>
                  </>
                )}
                {kind === "scorecards" && (
                  <>
                    <TableHead>Manager</TableHead>
                    <TableHead>Weighted Pipeline</TableHead>
                    <TableHead>Close Rate</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Stalled</TableHead>
                  </>
                )}
                {kind === "cadence" && (
                  <>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Last Touch</TableHead>
                    <TableHead>Compliant</TableHead>
                  </>
                )}
                {kind === "profitability" && (
                  <>
                    <TableHead>Event</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>COGS</TableHead>
                    <TableHead>Margin %</TableHead>
                  </>
                )}
                {kind === "commission" && (
                  <>
                    <TableHead>Event</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Model</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((row: any, idx: number) => (
                <TableRow key={row.id || row.eventId || idx}>
                  {kind === "next-actions" && (
                    <>
                      <TableCell>{row.prospect_id || row.prospectId}</TableCell>
                      <TableCell>
                        {row.owner_id || row.ownerId || "—"}
                      </TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.due_at || row.dueAt}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </>
                  )}
                  {kind === "stage-velocity" && (
                    <>
                      <TableCell>{row.prospectId}</TableCell>
                      <TableCell>{row.stage}</TableCell>
                      <TableCell>{row.daysInStage}</TableCell>
                      <TableCell>{row.ownerId || "—"}</TableCell>
                    </>
                  )}
                  {kind === "scorecards" && (
                    <>
                      <TableCell>{row.managerId}</TableCell>
                      <TableCell>
                        $
                        {Math.round(
                          row.weightedPipelineValue || 0,
                        ).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {Math.round((row.closeRate || 0) * 100)}%
                      </TableCell>
                      <TableCell>{row.overdueActions}</TableCell>
                      <TableCell>{row.stalledDeals}</TableCell>
                    </>
                  )}
                  {kind === "cadence" && (
                    <>
                      <TableCell>{row.prospectId}</TableCell>
                      <TableCell>{row.ownerId || "—"}</TableCell>
                      <TableCell>{row.lastTouchAt || "—"}</TableCell>
                      <TableCell>{row.isCompliant ? "Yes" : "No"}</TableCell>
                    </>
                  )}
                  {kind === "profitability" && (
                    <>
                      <TableCell>{row.eventId}</TableCell>
                      <TableCell>
                        ${Math.round(row.revenueForecast || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        ${Math.round(row.cogsForecast || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {Math.round((row.marginPct || 0) * 100)}%
                      </TableCell>
                    </>
                  )}
                  {kind === "commission" && (
                    <>
                      <TableCell>{row.eventId}</TableCell>
                      <TableCell>
                        ${Math.round(row.revenue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        $
                        {Math.round(row.commissionAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{row.model}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
