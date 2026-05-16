import React, { useCallback, useEffect, useMemo, useState } from "react";
import { get, post } from "@/lib/api-client";
import { openPanel } from "../../../../lib/open-panel";
import { osBus } from "@/lib/os-bus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type SalesGoalSummary = {
  userId: string;
  year: number;
  annualTarget: number;
  actualRevenue: number;
  pipelineRevenue: number;
  pipelineCount: number;
  pipelineTarget: number;
  conversionRatio: { prospects: number; clients: number; wins: number };
  requiredProspects?: number;
  coverageRatio?: number;
  monthlyRequiredProspects?: Record<string, number>;
  gap: number;
  attainment: number;
};

type SalesGoalsSummaryResponse = {
  success: boolean;
  data: SalesGoalSummary[];
};

type SalesGoalRecord = {
  user_id: string;
  year: number;
  goal_status: string;
  annual_target: number;
};

type SalesGoalsResponse = {
  success: boolean;
  data: SalesGoalRecord[];
};

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

function getUserNameForRequest(): string {
  if (typeof window === "undefined") return "Leader";
  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      const name = String(parsed?.name || parsed?.email || "Leader").trim();
      if (name) return name;
    } catch {
      // ignore
    }
  }
  return "Leader";
}

export default function SalesLeaderPage() {
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [summary, setSummary] = useState<SalesGoalSummary[]>([]);
  const [goals, setGoals] = useState<SalesGoalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteByUser, setNoteByUser] = useState<Record<string, string>>({});

  const goalsByUser = useMemo(() => {
    const map = new Map<string, SalesGoalRecord>();
    goals.forEach((goal) => map.set(String(goal.user_id), goal));
    return map;
  }, [goals]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, goalsRes] = await Promise.all([
        get<SalesGoalsSummaryResponse>(
          `/api/crm/sales-goals/summary?year=${year}`,
        ),
        get<SalesGoalsResponse>(`/api/crm/sales-goals?year=${year}`),
      ]);
      setSummary(Array.isArray(summaryRes?.data) ? summaryRes.data : []);
      setGoals(Array.isArray(goalsRes?.data) ? goalsRes.data : []);
    } catch (err) {
      setError("Unable to load sales goals");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const reviewGoal = useCallback(
    async (userId: string, status: "approved" | "revision_requested") => {
      try {
        await post("/api/crm/sales-goals/review", {
          userId,
          year,
          status,
          reviewNotes: noteByUser[userId] || "",
        });
        fetchAll();
      } catch {
        setError("Unable to update goal status");
      }
    },
    [fetchAll, noteByUser, year],
  );

  const sendMessage = useCallback(
    async (userId: string) => {
      const orgId = getOrgIdForRequest();
      const senderId = getUserIdForRequest();
      const senderName = getUserNameForRequest();
      const note = noteByUser[userId] || "Please review your sales goals.";

      try {
        const conversationRes = await fetch("/api/echo-chat/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": orgId,
          },
          body: JSON.stringify({
            orgId,
            type: "1to1",
            participants: [userId],
            name: `Sales Goals - ${userId}`,
          }),
        });
        const conversation = await conversationRes.json();
        if (!conversation?.id) {
          throw new Error("Missing conversation");
        }

        await fetch(
          `/api/echo-chat/conversations/${conversation.id}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Org-ID": orgId,
            },
            body: JSON.stringify({
              senderId,
              senderName,
              text: note,
            }),
          },
        );
        osBus.emit("ui:open_panel", {
          panelKey: "echo-chat",
          source: "SalesLeader",
          focus: true,
        });
        openPanel("echo-chat");
      } catch {
        setError("Unable to send chat message");
      }
    },
    [noteByUser],
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Leader</h1>
            <p className="text-muted-foreground mt-2">
              Review manager goals, pipeline coverage, and approvals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value || year))}
              className="w-28"
            />
            <Button variant="outline" onClick={fetchAll}>
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="border-red-500/40 bg-red-500/5">
            <CardContent className="p-4 text-sm text-red-500">
              {error}
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {summary.map((row) => {
              const goal = goalsByUser.get(row.userId);
              const status = goal?.goal_status || "draft";
              const risk =
                row.pipelineCount < row.pipelineTarget
                  ? "Pipeline below target"
                  : null;
              return (
                <Card key={`${row.userId}-${row.year}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{row.userId}</span>
                      <Badge variant="secondary">{status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Goal ${Math.round(row.annualTarget).toLocaleString()} •
                      Actual ${Math.round(row.actualRevenue).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>
                        Attainment {Math.round(row.attainment * 100)}% • Gap $
                        {Math.round(row.gap).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>
                        Pipeline {row.pipelineCount} • Target{" "}
                        {row.pipelineTarget}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.requiredProspects ? (
                        <>
                          Required prospects {row.requiredProspects} • Coverage{" "}
                          {Math.round((row.coverageRatio || 0) * 100)}%
                        </>
                      ) : (
                        <>Coverage needs more pipeline data</>
                      )}
                    </div>
                    {risk ? (
                      <div className="text-xs text-amber-600">{risk}</div>
                    ) : null}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Review note"
                        value={noteByUser[row.userId] || ""}
                        onChange={(event) =>
                          setNoteByUser((prev) => ({
                            ...prev,
                            [row.userId]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        variant="outline"
                        onClick={() => sendMessage(row.userId)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" /> Message
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            reviewGoal(row.userId, "revision_requested")
                          }
                        >
                          Request revision
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => reviewGoal(row.userId, "approved")}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
