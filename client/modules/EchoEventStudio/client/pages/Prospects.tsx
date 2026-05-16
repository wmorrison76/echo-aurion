import React, { useCallback, useEffect, useMemo, useState } from "react";
import { get, patch, post, put } from "@/lib/api-client";
import { osBus } from "@/lib/os-bus";
import type { CalendarEvent } from "../../../../types/calendar";
import { EventSeverity, EventStatus } from "../../../../types/calendar";
import type { Prospect, ProspectStage } from "@shared/types/prospect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { CreateProspectModal } from "../components/CreateProspectModal";
import {
  defaultStageAgingThresholds,
  evaluateStageAging,
} from "@shared/crm/pipeline-health";
import {
  buildDemoProspects,
  ensureDemoProspects,
  isDemoSeeded,
  saveDemoProspects,
  seedDemoData,
  updateDemoProspectStage,
  upsertDemoProspect,
} from "../lib/demo-data";

type ProspectStageFilter = "all" | ProspectStage;

type ProspectActivityType =
  | "call"
  | "email"
  | "meeting"
  | "proposal_sent"
  | "quote_sent"
  | "follow_up"
  | "note";

type StageHistoryEntry = {
  id: string;
  from_stage: ProspectStage | null;
  to_stage: ProspectStage;
  user_id: string;
  timestamp: string;
  notes?: string | null;
  metadata?: Record<string, any>;
};

type ProspectActivity = {
  id: string;
  activity_type: ProspectActivityType;
  activity_data?: Record<string, any>;
  user_id: string;
  timestamp: string;
};

const STAGE_LABEL: Record<ProspectStage, string> = {
  prospect: "Prospect",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  beo_created: "BEO Created",
  lost: "Lost",
};

const STAGE_BADGE: Record<ProspectStage, string> = {
  prospect: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  qualified: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  proposal: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  negotiation: "bg-primary/10 text-primary border-primary/20",
  won: "bg-green-500/10 text-green-600 border-green-500/20",
  beo_created: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-600 border-red-500/20",
};

const STAGE_ORDER: ProspectStage[] = [
  "prospect",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "beo_created",
  "lost",
];

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";
  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      const id = String(parsed?.org_id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  return "default";
}

function getUserIdForRequest(): string {
  if (typeof window === "undefined") return "local";
  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  return "local";
}

function buildYearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, idx) => {
    const month = String(idx + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  });
}

function buildProspectCalendarEvent(prospect: Prospect): CalendarEvent {
  const orgId = prospect.org_id || getOrgIdForRequest();
  const outletId = prospect.outlet_id || "default";
  const date = prospect.event_date;
  const start_time = `${date}T12:00:00.000Z`;
  const end_time = `${date}T16:00:00.000Z`;
  return {
    id: `prospect-${prospect.id}`,
    org_id: orgId,
    outlet_id: outletId,
    title: `${prospect.name} (Possible)`,
    description: prospect.description || undefined,
    start_time,
    end_time,
    date,
    location_room: undefined,
    guest_count: Number(prospect.guest_count || 0),
    department: "Events",
    status: EventStatus.PENDING,
    severity: EventSeverity.NORMAL,
    created_by: prospect.created_by || "system",
    created_at: prospect.created_at || new Date().toISOString(),
    updated_at: prospect.updated_at || new Date().toISOString(),
    revenue: Number(prospect.estimated_revenue || 0),
    contact_person: prospect.contact_name || undefined,
    tags: ["prospect"],
    metadata: {
      prospectId: prospect.id,
      prospectStage: prospect.status,
      eventTypeCode: prospect.event_type_code,
      isProspect: true,
      scheduling_conflicts: prospect.scheduling_conflicts,
    },
  };
}

export default function ProspectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProspectStageFilter>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineProspect, setTimelineProspect] = useState<Prospect | null>(
    null,
  );
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([]);
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [activityType, setActivityType] =
    useState<ProspectActivityType>("note");
  const [activityNote, setActivityNote] = useState("");
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [goalStatus, setGoalStatus] = useState<string | null>(null);
  const [goalYear, setGoalYear] = useState(new Date().getUTCFullYear());
  const [annualTarget, setAnnualTarget] = useState(0);
  const [pipelineTarget, setPipelineTarget] = useState(80);
  const [conversionProspects, setConversionProspects] = useState(10);
  const [conversionClients, setConversionClients] = useState(3);
  const [conversionWins, setConversionWins] = useState(1);
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, number>>(
    {},
  );

  const fetchProspects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await get<any>("/api/prospects");
      const list = Array.isArray(response?.prospects) ? response.prospects : [];
      setProspects(list.filter(Boolean));
      setError(null);
      setDemoMode(false);
    } catch (err) {
      const fallback = ensureDemoProspects();
      setProspects(fallback);
      setError(null);
      setDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSalesGoals = useCallback(async () => {
    setGoalsLoading(true);
    setGoalsError(null);
    const userId = getUserIdForRequest();
    try {
      const response = await get<any>(`/api/crm/sales-goals?year=${goalYear}`);
      const goals = Array.isArray(response?.data) ? response.data : [];
      const goal = goals.find((g: any) => String(g.user_id) === userId);

      if (goal) {
        setAnnualTarget(Number(goal.annual_target || 0));
        setPipelineTarget(Number(goal.pipeline_target || 80));
        setGoalStatus(goal.goal_status || "draft");
        const ratio = goal.conversion_ratio || {
          prospects: 10,
          clients: 3,
          wins: 1,
        };
        setConversionProspects(Number(ratio.prospects || 10));
        setConversionClients(Number(ratio.clients || 3));
        setConversionWins(Number(ratio.wins || 1));
        const targets =
          goal.monthly_targets && typeof goal.monthly_targets === "object"
            ? goal.monthly_targets
            : {};
        setMonthlyTargets(targets);
        return;
      }

      const months = buildYearMonths(goalYear);
      const perMonth = annualTarget ? Math.round(annualTarget / 12) : 0;
      const defaults: Record<string, number> = {};
      months.forEach((month) => {
        defaults[month] = perMonth;
      });
      setMonthlyTargets(defaults);
      setGoalStatus("draft");
    } catch (error) {
      setGoalsError("Unable to load goals");
    } finally {
      setGoalsLoading(false);
    }
  }, [annualTarget, goalYear]);

  const saveSalesGoals = useCallback(async () => {
    setGoalsLoading(true);
    setGoalsError(null);
    try {
      const payload = {
        year: goalYear,
        annualTarget: Number(annualTarget || 0),
        monthlyTargets,
        pipelineTarget: Number(pipelineTarget || 0),
        conversionRatio: {
          prospects: Number(conversionProspects || 10),
          clients: Number(conversionClients || 3),
          wins: Number(conversionWins || 1),
        },
      };
      const response = await put<any>("/api/crm/sales-goals", payload);
      setGoalStatus(response?.data?.goal_status || "draft");
    } catch (error) {
      setGoalsError("Unable to save goals");
    } finally {
      setGoalsLoading(false);
    }
  }, [
    annualTarget,
    conversionClients,
    conversionProspects,
    conversionWins,
    goalYear,
    monthlyTargets,
    pipelineTarget,
  ]);

  const submitSalesGoals = useCallback(async () => {
    setGoalsLoading(true);
    setGoalsError(null);
    try {
      const response = await post<any>("/api/crm/sales-goals/submit", {
        year: goalYear,
      });
      setGoalStatus(response?.data?.goal_status || "submitted");
    } catch (error) {
      setGoalsError("Unable to submit goals");
    } finally {
      setGoalsLoading(false);
    }
  }, [goalYear]);

  useEffect(() => {
    fetchProspects();
    setDemoSeeded(isDemoSeeded());
    const handleProspectCreatedEvent = () => fetchProspects();
    const handleDemoSeeded = () => setDemoSeeded(true);
    window.addEventListener("prospect-created", handleProspectCreatedEvent);
    window.addEventListener(
      "echoeventstudio:demo-seeded",
      handleDemoSeeded as EventListener,
    );
    return () => {
      window.removeEventListener(
        "prospect-created",
        handleProspectCreatedEvent,
      );
      window.removeEventListener(
        "echoeventstudio:demo-seeded",
        handleDemoSeeded as EventListener,
      );
    };
  }, [fetchProspects]);

  useEffect(() => {
    if (!isGoalsOpen) return;
    loadSalesGoals();
  }, [isGoalsOpen, loadSalesGoals]);

  const filteredProspects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return prospects.filter((p) => {
      const matchesSearch =
        q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        String(p.contact_name || "")
          .toLowerCase()
          .includes(q) ||
        String(p.email || "")
          .toLowerCase()
          .includes(q);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [prospects, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = prospects.length;
    const won = prospects.filter(
      (p) => p.status === "won" || p.status === "beo_created",
    ).length;
    const inProgress = prospects.filter((p) =>
      ["prospect", "qualified", "proposal", "negotiation"].includes(p.status),
    ).length;
    const totalValue = prospects.reduce(
      (sum, p) => sum + (p.estimated_revenue || 0),
      0,
    );
    const conflicts = prospects.filter((p) =>
      Boolean(p.scheduling_conflicts),
    ).length;
    const aging = evaluateStageAging(prospects, defaultStageAgingThresholds());
    return { total, won, inProgress, totalValue, conflicts, aging };
  }, [prospects]);

  const goalMonths = useMemo(() => buildYearMonths(goalYear), [goalYear]);

  const handleProspectCreated = (newProspect: any) => {
    if (!newProspect || typeof newProspect !== "object") {
      fetchProspects();
      return;
    }
    const id = (newProspect as any).id;
    const name = (newProspect as any).name;
    if (!id || typeof name !== "string" || name.trim().length === 0) {
      fetchProspects();
      return;
    }
    const created = newProspect as Prospect;
    setProspects((prev) => [created, ...prev]);
    try {
      osBus.emit("calendar:event_created", {
        eventId: `prospect-${created.id}`,
        source: "EchoEventStudio",
        event: buildProspectCalendarEvent(created),
      });
      osBus.emit("prospect:stage_changed", {
        prospectId: created.id,
        stage: created.status,
        source: "EchoEventStudio",
        prospect: created,
      });
    } catch {
      // ignore bus errors
    }
  };

  const openTimeline = useCallback(
    async (prospect: Prospect) => {
      setTimelineProspect(prospect);
      setTimelineOpen(true);
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        if (demoMode) {
          setStageHistory([
            {
              id: `demo-history-${prospect.id}`,
              from_stage: null,
              to_stage: prospect.status,
              user_id: "demo",
              timestamp: new Date().toISOString(),
              notes: "Demo timeline entry",
            },
          ]);
          setActivities([]);
          return;
        }
        const [historyRes, activitiesRes] = await Promise.all([
          get<{ history?: StageHistoryEntry[] }>(
            `/api/prospects/${prospect.id}/stage-history?limit=50`,
          ),
          get<{ activities?: ProspectActivity[] }>(
            `/api/prospects/${prospect.id}/activities?limit=50`,
          ),
        ]);
        setStageHistory(
          Array.isArray(historyRes?.history) ? historyRes.history : [],
        );
        setActivities(
          Array.isArray(activitiesRes?.activities)
            ? activitiesRes.activities
            : [],
        );
      } catch (err) {
        setTimelineError(
          err instanceof Error ? err.message : "Failed to load timeline",
        );
      } finally {
        setTimelineLoading(false);
      }
    },
    [demoMode],
  );

  const submitActivity = useCallback(async () => {
    if (!timelineProspect) return;
    if (!activityNote.trim()) return;
    try {
      setActivitySubmitting(true);
      if (demoMode) {
        const activity: ProspectActivity = {
          id: `demo-activity-${Date.now()}`,
          activity_type: activityType,
          activity_data: { note: activityNote.trim() },
          user_id: "demo",
          timestamp: new Date().toISOString(),
        };
        setActivities((prev) => [activity, ...prev]);
        setActivityNote("");
        return;
      }
      const payload = {
        activity_type: activityType,
        activity_data: {
          note: activityNote.trim(),
        },
      };
      const response = await post<{ activity?: ProspectActivity }>(
        `/api/prospects/${timelineProspect.id}/activities`,
        payload,
      );
      if (response?.activity) {
        setActivities((prev) => [
          response.activity as ProspectActivity,
          ...prev,
        ]);
      }
      setActivityNote("");
    } catch (err) {
      setTimelineError(
        err instanceof Error ? err.message : "Failed to log activity",
      );
    } finally {
      setActivitySubmitting(false);
    }
  }, [activityNote, activityType, demoMode, timelineProspect]);

  const updateProspectStage = useCallback(
    async (prospect: Prospect, nextStage: ProspectStage) => {
      try {
        setUpdatingId(prospect.id);
        if (demoMode) {
          const next = updateDemoProspectStage(prospect.id, nextStage);
          setProspects(next);
          return;
        }
        const res = await patch<{ success: boolean; prospect: Prospect }>(
          `/api/prospects/${prospect.id}`,
          { status: nextStage },
        );
        const updated = res?.prospect ?? { ...prospect, status: nextStage };
        setProspects((prev) =>
          prev.map((p) => (p.id === prospect.id ? updated : p)),
        );
        osBus.emit("prospect:stage_changed", {
          prospectId: prospect.id,
          stage: nextStage,
          source: "EchoEventStudio",
          prospect: updated,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update prospect",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [demoMode],
  );

  const confirmProspectEvent = useCallback(
    async (prospect: Prospect) => {
      try {
        if (prospect.scheduling_conflicts) {
          const proceed = window.confirm(
            "Capacity conflicts detected for this date. Confirm anyway?",
          );
          if (!proceed) return;
        }
        const eventDate = new Date(prospect.event_date);
        const daysOut = Math.ceil(
          (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (
          Number.isFinite(daysOut) &&
          daysOut <= 3 &&
          (prospect.guest_count || 0) > 200
        ) {
          const proceed = window.confirm(
            "High-capacity event inside 72 hours. Confirming will trigger cross-department gating. Continue?",
          );
          if (!proceed) return;
        }
        setUpdatingId(prospect.id);
        if (demoMode) {
          const next = updateDemoProspectStage(prospect.id, "beo_created");
          setProspects(next);
          return;
        }
        const res = await post<any>(
          `/api/calendar/prospects/${prospect.id}/confirm-event`,
        );
        const confirmedEvent = res?.event;
        const updatedProspect = res?.prospect ?? {
          ...prospect,
          status: "beo_created" as ProspectStage,
        };
        setProspects((prev) =>
          prev.map((p) => (p.id === prospect.id ? updatedProspect : p)),
        );
        if (confirmedEvent?.id) {
          osBus.emit("calendar:event_created", {
            eventId: confirmedEvent.id,
            source: "EchoEventStudio",
            event: confirmedEvent,
          });
        }
        osBus.emit("prospect:converted", {
          prospectId: prospect.id,
          eventId: confirmedEvent?.id,
          source: "EchoEventStudio",
          prospect: updatedProspect,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to confirm event",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [demoMode],
  );

  const getNextStage = (stage: ProspectStage): ProspectStage | null => {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
    const next = STAGE_ORDER[idx + 1];
    if (next === "lost") return null;
    return next;
  };

  const isoDateFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const createDemoProspect = useCallback(async (payload: any) => {
    const now = new Date().toISOString();
    const prospect: Prospect = {
      id: `demo-${Date.now()}`,
      name: String(payload?.name || "New Prospect"),
      contact_name: payload?.contact_name || payload?.contact || null,
      email: String(payload?.email || "demo@luccca.local"),
      phone: payload?.phone || null,
      status: (payload?.status || "prospect") as ProspectStage,
      event_type_code: payload?.event_type_code || "OTH",
      event_date: payload?.event_date || isoDateFromNow(14),
      guest_count: payload?.guest_count ?? null,
      estimated_revenue: payload?.estimated_revenue ?? null,
      description: payload?.description || null,
      created_by: "demo",
      created_at: now,
      updated_at: now,
    };
    const next = upsertDemoProspect(prospect);
    setProspects(next);
    return { prospect };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Prospect Pipeline</h1>
            <p className="text-muted-foreground">
              Move leads from first contact to BEO.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsGoalsOpen(true)}>
              Sales Goals
            </Button>
            <Button
              className="shadow-glow"
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Prospect
            </Button>
          </div>
        </div>

        {demoMode ? (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-semibold">Demo mode active</div>
                <div className="text-muted-foreground">
                  Backend unavailable. Using local demo prospects.
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!demoSeeded ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      saveDemoProspects(buildDemoProspects());
                      seedDemoData();
                      setDemoSeeded(true);
                      fetchProspects();
                    }}
                  >
                    Seed demo data
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Prospects
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Active in pipeline
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won / BEO</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.won}
              </div>
              <p className="text-xs text-muted-foreground">
                Closed / operational
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.inProgress}
              </div>
              <p className="text-xs text-muted-foreground">
                Prospect → Negotiation
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                ${Math.round(stats.totalValue).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Pipeline total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats.conflicts}
              </div>
              <p className="text-xs text-muted-foreground">Scheduling risks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stale Deals</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.aging.totalStale}
              </div>
              <p className="text-xs text-muted-foreground">
                Exceeded stage aging thresholds
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by company, contact, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="beo_created">BEO Created</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600">
              {error}
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No prospects found</p>
            </div>
          ) : (
            filteredProspects.map((p) => {
              const hasConflicts = Boolean(p.scheduling_conflicts);
              const nextStage = getNextStage(p.status);
              const canConfirm = ["won", "beo_created"].includes(p.status);
              return (
                <Card
                  key={p.id}
                  className="hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {hasConflicts ? (
                            <Badge variant="destructive">Conflict</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                          <h3 className="font-semibold text-lg">{p.name}</h3>
                          <Badge className={STAGE_BADGE[p.status]}>
                            {STAGE_LABEL[p.status]}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mt-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {p.contact_name || "N/A"}
                            </p>
                            <p className="truncate">{p.email}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Event</p>
                            <p>{p.event_type_code}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Date</p>
                            <p>{new Date(p.event_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Est. Revenue
                            </p>
                            <p className="text-green-600 font-semibold">
                              ${(p.estimated_revenue || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openTimeline(p)}
                        >
                          Activity
                        </Button>
                        {nextStage && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === p.id}
                            onClick={() => updateProspectStage(p, nextStage)}
                          >
                            {updatingId === p.id
                              ? "Updating..."
                              : `Advance → ${STAGE_LABEL[nextStage]}`}
                          </Button>
                        )}
                        {canConfirm && (
                          <Button
                            size="sm"
                            className="shadow-glow"
                            disabled={updatingId === p.id}
                            onClick={() => confirmProspectEvent(p)}
                          >
                            {updatingId === p.id
                              ? "Confirming..."
                              : "Confirm Event"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <CreateProspectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onProspectCreated={handleProspectCreated}
          createProspect={demoMode ? createDemoProspect : undefined}
        />

        <Dialog open={isGoalsOpen} onOpenChange={setIsGoalsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Sales Goals</DialogTitle>
              <DialogDescription>
                Set annual and monthly targets, aligned to the 10:3:1 funnel
                rule.
              </DialogDescription>
            </DialogHeader>
            {goalsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading goals…
              </div>
            ) : (
              <div className="space-y-4">
                {goalsError ? (
                  <div className="text-sm text-red-500">{goalsError}</div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Year
                    </label>
                    <Input
                      type="number"
                      value={goalYear}
                      onChange={(event) =>
                        setGoalYear(Number(event.target.value || goalYear))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Annual target ($)
                    </label>
                    <Input
                      type="number"
                      value={annualTarget}
                      onChange={(event) =>
                        setAnnualTarget(Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Pipeline target
                    </label>
                    <Input
                      type="number"
                      value={pipelineTarget}
                      onChange={(event) =>
                        setPipelineTarget(Number(event.target.value || 0))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Prospects
                    </label>
                    <Input
                      type="number"
                      value={conversionProspects}
                      onChange={(event) =>
                        setConversionProspects(Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Clients
                    </label>
                    <Input
                      type="number"
                      value={conversionClients}
                      onChange={(event) =>
                        setConversionClients(Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Wins
                    </label>
                    <Input
                      type="number"
                      value={conversionWins}
                      onChange={(event) =>
                        setConversionWins(Number(event.target.value || 0))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    Status:{" "}
                    <span className="font-medium">{goalStatus || "draft"}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const perMonth = annualTarget
                        ? Math.round(annualTarget / 12)
                        : 0;
                      const nextTargets: Record<string, number> = {};
                      goalMonths.forEach((month) => {
                        nextTargets[month] = perMonth;
                      });
                      setMonthlyTargets(nextTargets);
                    }}
                  >
                    Distribute evenly
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {goalMonths.map((month) => (
                    <div key={month}>
                      <label className="text-xs text-muted-foreground">
                        {month.slice(0, 7)}
                      </label>
                      <Input
                        type="number"
                        value={Number(monthlyTargets?.[month] || 0)}
                        onChange={(event) =>
                          setMonthlyTargets((prev) => ({
                            ...prev,
                            [month]: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setIsGoalsOpen(false)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={saveSalesGoals}>
                  Save draft
                </Button>
                <Button className="shadow-glow" onClick={submitSalesGoals}>
                  Submit for review
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={timelineOpen}
          onOpenChange={(next) => {
            setTimelineOpen(next);
            if (!next) {
              setTimelineProspect(null);
              setTimelineError(null);
              setStageHistory([]);
              setActivities([]);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Prospect Activity</DialogTitle>
              <DialogDescription>
                {timelineProspect?.name
                  ? `Timeline and notes for ${timelineProspect.name}`
                  : "Timeline and notes"}
              </DialogDescription>
            </DialogHeader>
            {timelineLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Stage History</div>
                  <ScrollArea className="h-64 rounded-lg border border-border/50 p-3">
                    {stageHistory.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No stage history yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {stageHistory.map((entry) => (
                          <div key={entry.id} className="text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {STAGE_LABEL[entry.to_stage]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {entry.from_stage ? (
                              <div className="text-xs text-muted-foreground">
                                From {STAGE_LABEL[entry.from_stage]}
                              </div>
                            ) : null}
                            {entry.notes ? (
                              <div className="text-xs text-muted-foreground">
                                {entry.notes}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Activity Log</div>
                  <ScrollArea className="h-64 rounded-lg border border-border/50 p-3">
                    {activities.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        No activities yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="capitalize">
                                {activity.activity_type.replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(activity.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {activity.activity_data?.note ? (
                              <div className="text-xs text-muted-foreground">
                                {activity.activity_data.note}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="space-y-2 rounded-lg border border-border/50 p-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Log activity
                    </div>
                    <Select
                      value={activityType}
                      onValueChange={(value) =>
                        setActivityType(value as ProspectActivityType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="proposal_sent">
                          Proposal Sent
                        </SelectItem>
                        <SelectItem value="quote_sent">Quote Sent</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={activityNote}
                      onChange={(event) => setActivityNote(event.target.value)}
                      placeholder="Capture notes, promises, and next actions..."
                      rows={3}
                    />
                    {timelineError ? (
                      <div className="text-xs text-red-600">
                        {timelineError}
                      </div>
                    ) : null}
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={submitActivity}
                        disabled={activitySubmitting || !activityNote.trim()}
                      >
                        {activitySubmitting ? "Saving..." : "Save Activity"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
