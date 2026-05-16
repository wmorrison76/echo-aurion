/**
 * LUCCCA — BUILD 38
 * Real-Time Event Risk Dashboard with ML Risk Assessment
 *
 * PURPOSE:
 * - Visualize health/risk of all events with ML-based analysis
 * - Display ML risk scores, confidence, and historical patterns
 * - Show risk mitigation recommendations
 * - Enable proactive action
 */

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  BarChart3,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import RiskPlaybookPanel, { type RiskDriver } from "./RiskPlaybookPanel";

interface MLRiskAssessment {
  eventId: string;
  mlScore: number;
  mlConfidence: number;
  baseScore: number;
  band: "low" | "medium" | "high" | "critical";
  riskFactors: Array<{
    factor: string;
    impact: number;
    category:
      | "operational"
      | "temporal"
      | "logistical"
      | "financial"
      | "guest_experience";
    severity: "low" | "medium" | "high" | "critical";
    mlDetected: boolean;
  }>;
  mitigationRecommendations: Array<{
    recommendation: string;
    priority: "high" | "medium" | "low";
    expectedImpact: string;
    implementationEffort: "low" | "medium" | "high";
    category: string;
  }>;
  historicalPattern?: {
    similarEvents: number;
    averageRiskScore: number;
    successRate: number;
  };
  assessedAt: string;
}

interface EventRiskData {
  id: string;
  name: string;
  eventDate: string;
  headcount: number;
  assessment?: MLRiskAssessment;
}

export default function EventRiskDashboard() {
  const [events, setEvents] = useState<EventRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showMitigations, setShowMitigations] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      // Fetch events with risk assessments
      const response = await fetch("/api/ml-risk-assessment/dashboard", {
        headers: {
          "X-Org-ID": "default", // TODO: Get from auth context
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load risk assessments");
      }

      const { summary } = await response.json();

      // Fetch individual event assessments
      const eventsResponse = await fetch("/api/ml-risk-assessment/events", {
        headers: {
          "X-Org-ID": "default", // TODO: Get from auth context
        },
      });

      if (eventsResponse.ok) {
        const { assessments } = await eventsResponse.json();
        // Map assessments to events (this would come from actual events in production)
        const mockEvents: EventRiskData[] = [
          {
            id: "e1",
            name: "Wedding Reception",
            eventDate: "2025-02-15",
            headcount: 200,
            assessment: assessments.find(
              (a: MLRiskAssessment) => a.eventId === "e1",
            ),
          },
          {
            id: "e2",
            name: "Corporate Gala",
            eventDate: "2025-02-18",
            headcount: 150,
            assessment: assessments.find(
              (a: MLRiskAssessment) => a.eventId === "e2",
            ),
          },
          {
            id: "e3",
            name: "Charity Fundraiser",
            eventDate: "2025-02-20",
            headcount: 300,
            assessment: assessments.find(
              (a: MLRiskAssessment) => a.eventId === "e3",
            ),
          },
        ];
        setEvents(mockEvents);
      } else {
        // Use mock data if API fails
        setEvents([
          {
            id: "e1",
            name: "Wedding Reception",
            eventDate: "2025-02-15",
            headcount: 200,
          },
          {
            id: "e2",
            name: "Corporate Gala",
            eventDate: "2025-02-18",
            headcount: 150,
          },
        ]);
      }
    } catch (error) {
      console.error("[EventRiskDashboard] Failed to load events", error);
      // Use mock data on error
      setEvents([
        {
          id: "e1",
          name: "Wedding Reception",
          eventDate: "2025-02-15",
          headcount: 200,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function assessEvent(eventId: string) {
    try {
      const response = await fetch("/api/ml-risk-assessment/assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": "default", // TODO: Get from auth context
        },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) {
        throw new Error("Failed to assess event");
      }

      const { assessment } = await response.json();
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, assessment } : e)),
      );
    } catch (error) {
      console.error("[EventRiskDashboard] Failed to assess event", error);
    }
  }

  const getRiskColor = (band: string): string => {
    switch (band) {
      case "critical":
        return "bg-red-600 text-white border-red-700";
      case "high":
        return "bg-orange-600 text-white border-orange-700";
      case "medium":
        return "bg-amber-500 text-white border-amber-600";
      case "low":
        return "bg-emerald-600 text-white border-emerald-700";
      default:
        return "bg-slate-600 text-white border-slate-700";
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-amber-600";
    return "text-red-600";
  };

  const highRiskEvents = events.filter(
    (e) =>
      e.assessment &&
      (e.assessment.band === "high" || e.assessment.band === "critical"),
  );

  const selectedEventData = events.find((e) => e.id === selectedEvent);

  return (
    <div className="w-full h-full overflow-y-auto bg-background font-sans p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Event Risk Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            ML-powered risk assessment and mitigation recommendations
          </p>
        </div>
        <Button onClick={() => loadEvents()} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">
            Loading risk assessments...
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {events.length}
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                highRiskEvents.length > 0 && "border-red-200 bg-red-50/50",
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    highRiskEvents.length > 0
                      ? "text-red-600"
                      : "text-foreground",
                  )}
                >
                  {highRiskEvents.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg ML Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {events.length > 0
                    ? Math.round(
                        events
                          .filter((e) => e.assessment)
                          .reduce(
                            (sum, e) => sum + (e.assessment?.mlScore || 0),
                            0,
                          ) / events.filter((e) => e.assessment).length,
                      )
                    : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {events.length > 0
                    ? Math.round(
                        (events
                          .filter((e) => e.assessment)
                          .reduce(
                            (sum, e) => sum + (e.assessment?.mlConfidence || 0),
                            0,
                          ) /
                          events.filter((e) => e.assessment).length) *
                          100,
                      )
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          {/* High Risk Alerts */}
          {highRiskEvents.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  High Risk Events Requiring Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {highRiskEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 border border-red-200 rounded-lg bg-white hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedEvent(event.id);
                        setShowMitigations(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">
                            {event.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(event.eventDate).toLocaleDateString()} •{" "}
                            {event.headcount} guests
                          </p>
                          {event.assessment && (
                            <div className="mt-2 flex items-center gap-4 text-xs">
                              <span
                                className={cn(
                                  "font-semibold",
                                  getConfidenceColor(
                                    event.assessment.mlConfidence,
                                  ),
                                )}
                              >
                                ML Score: {Math.round(event.assessment.mlScore)}
                                /100
                              </span>
                              <span className="text-muted-foreground">
                                Confidence:{" "}
                                {Math.round(
                                  event.assessment.mlConfidence * 100,
                                )}
                                %
                              </span>
                              {event.assessment.historicalPattern && (
                                <span className="text-muted-foreground">
                                  {
                                    event.assessment.historicalPattern
                                      .similarEvents
                                  }{" "}
                                  similar events
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {event.assessment && (
                          <Badge
                            className={getRiskColor(event.assessment.band)}
                          >
                            {event.assessment.band.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      {event.assessment &&
                        event.assessment.mitigationRecommendations.length >
                          0 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-xs font-medium text-red-900 mb-1">
                              {
                                event.assessment.mitigationRecommendations
                                  .length
                              }{" "}
                              Mitigation Recommendations
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {event.assessment.mitigationRecommendations
                                .slice(0, 3)
                                .map((rec, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {rec.priority === "high" && "🔴"}{" "}
                                    {rec.category}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="events" className="space-y-4">
            <TabsList>
              <TabsTrigger value="events">All Events</TabsTrigger>
              <TabsTrigger value="mitigations">Mitigations</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer",
                          event.assessment?.band === "critical" ||
                            event.assessment?.band === "high"
                            ? "border-red-200 bg-red-50/30"
                            : "border-border bg-background",
                        )}
                        onClick={() => {
                          setSelectedEvent(event.id);
                          setShowMitigations(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-foreground">
                                {event.name}
                              </h4>
                              {!event.assessment && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    assessEvent(event.id);
                                  }}
                                >
                                  Assess Risk
                                </Button>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(event.eventDate).toLocaleDateString()} •{" "}
                              {event.headcount} guests
                            </p>
                            {event.assessment && (
                              <>
                                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Base Score
                                    </span>
                                    <div className="font-semibold text-foreground">
                                      {event.assessment.baseScore}/100
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      ML Score
                                    </span>
                                    <div
                                      className={cn(
                                        "font-semibold",
                                        getConfidenceColor(
                                          event.assessment.mlConfidence,
                                        ),
                                      )}
                                    >
                                      {Math.round(event.assessment.mlScore)}/100
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Confidence
                                    </span>
                                    <div
                                      className={cn(
                                        "font-semibold",
                                        getConfidenceColor(
                                          event.assessment.mlConfidence,
                                        ),
                                      )}
                                    >
                                      {Math.round(
                                        event.assessment.mlConfidence * 100,
                                      )}
                                      %
                                    </div>
                                  </div>
                                </div>
                                {event.assessment.historicalPattern && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    📊{" "}
                                    {
                                      event.assessment.historicalPattern
                                        .similarEvents
                                    }{" "}
                                    similar events •{" "}
                                    {Math.round(
                                      event.assessment.historicalPattern
                                        .successRate * 100,
                                    )}
                                    % success rate
                                  </div>
                                )}
                                {event.assessment.riskFactors.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-xs font-medium text-foreground mb-2">
                                      Top Risk Factors
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {event.assessment.riskFactors
                                        .sort((a, b) => b.impact - a.impact)
                                        .slice(0, 3)
                                        .map((factor, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              factor.severity === "critical" &&
                                                "border-red-300 text-red-700",
                                              factor.severity === "high" &&
                                                "border-orange-300 text-orange-700",
                                            )}
                                          >
                                            {factor.factor} (+
                                            {Math.round(factor.impact)})
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {event.assessment && (
                            <Badge
                              className={getRiskColor(event.assessment.band)}
                            >
                              {event.assessment.band.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mitigations" className="space-y-4">
              {selectedEventData && selectedEventData.assessment ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Mitigation Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedEventData.assessment.mitigationRecommendations
                          .length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                            <p>No specific mitigations recommended</p>
                          </div>
                        ) : (
                          selectedEventData.assessment.mitigationRecommendations.map(
                            (rec, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "p-4 border rounded-lg",
                                  rec.priority === "high" &&
                                    "border-red-200 bg-red-50/30",
                                  rec.priority === "medium" &&
                                    "border-amber-200 bg-amber-50/30",
                                  rec.priority === "low" &&
                                    "border-border bg-background",
                                )}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <Badge
                                    className={cn(
                                      rec.priority === "high" && "bg-red-600",
                                      rec.priority === "medium" &&
                                        "bg-amber-600",
                                      rec.priority === "low" && "bg-slate-600",
                                    )}
                                  >
                                    {rec.priority.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline">
                                    {rec.category}
                                  </Badge>
                                </div>
                                <h4 className="font-semibold text-foreground mb-1">
                                  {rec.recommendation}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {rec.expectedImpact}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    Effort: {rec.implementationEffort}
                                  </span>
                                </div>
                              </div>
                            ),
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Playbook</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RiskPlaybookPanel
                        riskDrivers={selectedEventData.assessment.riskFactors.map(
                          (f) => ({
                            label: f.factor,
                            impact: Math.round(f.impact / 10), // Scale to 0-10
                            category: f.category,
                          }),
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-amber-500" />
                    <p>
                      Select an event with a risk assessment to view mitigation
                      recommendations
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>Analytics dashboard coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
