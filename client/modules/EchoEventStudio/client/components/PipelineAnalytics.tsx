import React from "react";
import { useNavigate } from "react-router-dom";
import { get } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  DollarSign,
  Loader2,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Prospect, ProspectStage } from "@shared/types/prospect";
import {
  ensureDemoProspects,
  isDemoSeeded,
  seedDemoData,
} from "../lib/demo-data";

type ProspectSummary = Pick<
  Prospect,
  | "id"
  | "name"
  | "status"
  | "event_date"
  | "guest_count"
  | "estimated_revenue"
  | "scheduling_conflicts"
>;

const STAGES: Array<{ id: ProspectStage; label: string; color: string }> = [
  { id: "prospect", label: "Prospect", color: "bg-slate-500/30" },
  { id: "qualified", label: "Qualified", color: "bg-blue-500/30" },
  { id: "proposal", label: "Proposal", color: "bg-purple-500/30" },
  { id: "negotiation", label: "Negotiation", color: "bg-primary/30" },
  { id: "won", label: "Won", color: "bg-green-500/30" },
  { id: "beo_created", label: "BEO Created", color: "bg-emerald-500/30" },
  { id: "lost", label: "Lost", color: "bg-red-500/30" },
];

export default function PipelineAnalytics() {
  const navigate = useNavigate();
  const [prospects, setProspects] = React.useState<ProspectSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedStage, setSelectedStage] = React.useState<"all" | ProspectStage>(
    "all",
  );
  const [demoMode, setDemoMode] = React.useState(false);
  const [demoSeeded, setDemoSeeded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchProspects = async () => {
      setIsLoading(true);
      try {
        const response = await get<{ prospects?: ProspectSummary[] }>("/api/prospects");
        const list = Array.isArray(response?.prospects)
          ? response.prospects
          : [];
        if (!active) return;
        setProspects(list.filter(Boolean));
        setDemoMode(false);
      } catch {
        if (!active) return;
        const fallback = ensureDemoProspects();
        setProspects(fallback);
        setDemoMode(true);
      }

      if (!active) return;
      setDemoSeeded(isDemoSeeded());
      setIsLoading(false);
    };
    fetchProspects();
    return () => {
      active = false;
    };
  }, []);

  const metrics = React.useMemo(() => {
    const byStage: Record<string, number> = {};
    for (const s of STAGES) byStage[s.id] = 0;
    for (const p of prospects) {
      byStage[p.status] = (byStage[p.status] || 0) + 1;
    }

    const pipelineValue = prospects
      .filter((p) => p.status !== "lost")
      .reduce((sum, p) => sum + Number(p.estimated_revenue || 0), 0);
    const wonValue = prospects
      .filter((p) => p.status === "won" || p.status === "beo_created")
      .reduce((sum, p) => sum + Number(p.estimated_revenue || 0), 0);

    const now = new Date();
    const upcomingEventCount = prospects.filter((p) => {
      const eventDate = new Date(p.event_date);
      return (
        eventDate > now && (p.status === "won" || p.status === "beo_created")
      );
    }).length;

    const totalOpen =
      byStage.prospect +
      byStage.qualified +
      byStage.proposal +
      byStage.negotiation;
    const totalProspects = prospects.length || 1;
    const conversionRate =
      ((byStage.won + byStage.beo_created) / totalProspects) * 100;

    const risk = prospects.filter(
      (p) =>
        (p.status === "won" || p.status === "beo_created") &&
        Boolean(p.scheduling_conflicts),
    ).length;

    return {
      byStage,
      pipelineValue,
      wonValue,
      upcomingEventCount,
      totalOpen,
      conversionRate,
      risk,
    };
  }, [prospects]);

  const filtered = React.useMemo(() => {
    if (selectedStage === "all") return prospects;
    return prospects.filter((p) => p.status === selectedStage);
  }, [prospects, selectedStage]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading pipeline…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (prospects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Analytics</CardTitle>
          <CardDescription>
            No prospects yet. Seed demo data or create your first lead.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate("/prospects")}>
            Create prospect
          </Button>
          {!demoSeeded ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                seedDemoData();
                setDemoSeeded(true);
                setProspects(ensureDemoProspects());
                setDemoMode(true);
              }}
            >
              Seed demo data
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {demoMode ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            Demo mode: using local prospects. Connect backend for live
            analytics.
          </CardContent>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(metrics.pipelineValue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {metrics.totalOpen} open deals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(metrics.wonValue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Won/BEO stages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.conversionRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Won / total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Events
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.upcomingEventCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Won/BEO with future dates
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel</CardTitle>
          <CardDescription>Prospects by stage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {STAGES.map((s) => {
            const max = Math.max(
              ...STAGES.map((x) => metrics.byStage[x.id] || 0),
              1,
            );
            const count = metrics.byStage[s.id] || 0;
            const pct = (count / max) * 100;
            return (
              <div key={s.id}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
                <div className="w-full bg-slate-700/20 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full ${s.color} flex items-center justify-end pr-3`}
                    style={{ width: `${pct}%` }}
                  >
                    {pct > 10 ? (
                      <span className="text-xs font-semibold">{count}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational Readiness</CardTitle>
          <CardDescription>
            Confirmed events with scheduling risks
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">
              At-risk confirmed events
            </span>
          </div>
          <Badge variant={metrics.risk > 0 ? "destructive" : "secondary"}>
            {metrics.risk}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Prospects</CardTitle>
              <CardDescription>Filter by stage</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStage === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStage("all")}
              >
                All
              </Button>
              {STAGES.map((s) => (
                <Button
                  key={s.id}
                  variant={selectedStage === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStage(s.id)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No prospects in this stage
            </p>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="p-4 rounded-lg border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.event_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{p.status}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {p.guest_count ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {p.guest_count} guests
                    </div>
                  ) : null}
                  {p.estimated_revenue ? (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> $
                      {Math.round(p.estimated_revenue).toLocaleString()}
                    </div>
                  ) : null}
                  {p.scheduling_conflicts ? (
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-amber-500" /> Conflicts
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
