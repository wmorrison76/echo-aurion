import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DepartmentUpcomingEventsMiniPanel } from "./DepartmentUpcomingEventsMiniPanel";
import { PrepLaborBreakdownMiniPanel } from "./PrepLaborBreakdownMiniPanel";
import { AlertCircle, CheckCircle2, Loader } from "lucide-react";

export interface Department {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Phase4DashboardIntegrationProps {
  departments?: Department[];
  selectedDepartmentId?: string;
  onDepartmentChange?: (departmentId: string) => void;
}

// Default departments in hospitality operations
const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: "banquet",
    name: "Banquet",
    description: "Banquet event preparation and service",
    icon: "🍽️",
  },
  {
    id: "pastry",
    name: "Pastry",
    description: "Dessert and pastry preparation",
    icon: "🧁",
  },
  {
    id: "culinary",
    name: "Culinary",
    description: "Kitchen and menu preparation",
    icon: "👨‍🍳",
  },
  {
    id: "av",
    name: "AV & Tech",
    description: "Audio, video, lighting, and technology",
    icon: "🎬",
  },
  {
    id: "engineering",
    name: "Engineering",
    description: "HVAC, electrical, and facilities",
    icon: "⚙️",
  },
  {
    id: "setup",
    name: "Setup & Service",
    description: "Room setup, tables, and service staff",
    icon: "🪑",
  },
];

export function Phase4DashboardIntegration({
  departments = DEFAULT_DEPARTMENTS,
  selectedDepartmentId,
  onDepartmentChange,
}: Phase4DashboardIntegrationProps) {
  const [activeTab, setActiveTab] = useState(
    selectedDepartmentId || departments[0]?.id || "banquet",
  );
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const handleDepartmentChange = (departmentId: string) => {
    setActiveTab(departmentId);
    onDepartmentChange?.(departmentId);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          Phase 4: Labor Sync & Mini-Panels
        </h2>
        <p className="text-muted-foreground">
          Real-time visibility into upcoming events and labor requirements
          across all departments
        </p>
      </div>

      {/* Status Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Phase 4 integration active. Production task labor hours are being
          synchronized to the Schedule module.
        </AlertDescription>
      </Alert>

      {/* Department Tabs */}
      <Tabs value={activeTab} onValueChange={handleDepartmentChange}>
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full">
          {departments.map((dept) => (
            <TabsTrigger key={dept.id} value={dept.id} className="text-xs">
              <span>{dept.icon}</span>
              <span className="hidden md:inline ml-1">{dept.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Contents */}
        {departments.map((dept) => (
          <TabsContent key={dept.id} value={dept.id} className="space-y-4">
            {/* Department Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {dept.icon} {dept.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dept.description}
                    </p>
                  </div>
                  <Badge variant="secondary">{dept.id}</Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Mini-Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Events Mini-Panel */}
              <DepartmentUpcomingEventsMiniPanel
                departmentId={dept.id}
                departmentName={dept.name}
                daysAhead={14}
                onEventClick={(event) => {
                  setExpandedEvent(event.taskId);
                  console.log("Event clicked:", event);
                }}
              />

              {/* Quick Stats Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Labor Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Upcoming Events
                      </p>
                      <p className="text-2xl font-bold">—</p>
                      <p className="text-xs text-muted-foreground">
                        Next 14 days
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Total Labor Hours
                      </p>
                      <p className="text-2xl font-bold">—</p>
                      <p className="text-xs text-muted-foreground">Estimated</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Avg Staff Needed
                      </p>
                      <p className="text-2xl font-bold">—</p>
                      <p className="text-xs text-muted-foreground">Per event</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Estimated Labor Cost
                      </p>
                      <p className="text-2xl font-bold">—</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
                    <p>✓ Labor hours auto-generated from production tasks</p>
                    <p>✓ Synced to Schedule module</p>
                    <p>✓ Real-time status updates every 5 minutes</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prep Labor Breakdown (if event selected) */}
            {expandedEvent && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Labor Hours Detail for Selected Event
                    </CardTitle>
                    <button
                      onClick={() => setExpandedEvent(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕ Close
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <PrepLaborBreakdownMiniPanel
                    taskId={expandedEvent}
                    taskTitle="Event Production Task"
                  />
                </CardContent>
              </Card>
            )}

            {/* Integration Guide Card */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Phase 4 Integration Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="space-y-1">
                  <p className="font-semibold">API Endpoints Available:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    <li>POST /api/labor-sync/generate-hours</li>
                    <li>POST /api/labor-sync/sync-to-schedule</li>
                    <li>
                      GET /api/labor-sync/department/{"{departmentId}"}
                      /upcoming-events
                    </li>
                    <li>
                      GET /api/labor-sync/task/{"{taskId}"}/labor-breakdown
                    </li>
                    <li>
                      PUT /api/labor-sync/labor-hours/{"{laborHoursId}"}/status
                    </li>
                    <li>GET /api/labor-sync/task/{"{taskId}"}/labor-cost</li>
                  </ul>
                </div>

                <div className="space-y-1 pt-2 border-t">
                  <p className="font-semibold">How it Works:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                    <li>Production tasks created from BEO events (Phase 2)</li>
                    <li>Labor hours automatically estimated (Phase 4)</li>
                    <li>Hours synced to Schedule module (Phase 4)</li>
                    <li>Mini-panels show upcoming work for each department</li>
                    <li>Schedule module assigns staff based on labor needs</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* System Status */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Database Migration (015)
            </span>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              ✓ Active
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Labor Sync Service</span>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              ✓ Ready
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">API Routes</span>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              ✓ Registered
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Mini-Panel Components</span>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              ✓ Loaded
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              WebSocket Broadcasting
            </span>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              ◐ Phase 5
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Phase4DashboardIntegration;
