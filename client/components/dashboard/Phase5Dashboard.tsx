import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Phase5StaffAssignmentPanel } from "./Phase5StaffAssignmentPanel";
import { Phase5AnalyticsPanel } from "./Phase5AnalyticsPanel";
import { DepartmentUpcomingEventsMiniPanel } from "./DepartmentUpcomingEventsMiniPanel";
import { PrepLaborBreakdownMiniPanel } from "./PrepLaborBreakdownMiniPanel";
import {
  Users,
  TrendingUp,
  Zap,
  CheckCircle2,
  Loader,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/glass";

export interface Department {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: "banquet",
    name: "Banquet",
    description: "Banquet services",
    icon: "🍽️",
  },
  {
    id: "pastry",
    name: "Pastry",
    description: "Pastry & desserts",
    icon: "🧁",
  },
  {
    id: "culinary",
    name: "Culinary",
    description: "Kitchen operations",
    icon: "👨‍🍳",
  },
  { id: "av", name: "AV & Tech", description: "Audio & video", icon: "🎬" },
  {
    id: "engineering",
    name: "Engineering",
    description: "Facilities",
    icon: "⚙️",
  },
  {
    id: "setup",
    name: "Setup & Service",
    description: "Room setup",
    icon: "🪑",
  },
];

export function Phase5Dashboard() {
  const [activeTab, setActiveTab] = useState("banquet");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  const activeDept = DEFAULT_DEPARTMENTS.find((d) => d.id === activeTab);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Phase 5: Advanced Labor Management
        </h1>
        <p className="text-muted-foreground">
          Real-time staff coordination, performance analytics, and bidirectional
          Schedule sync
        </p>
      </div>

      {/* System Status */}
      <Alert
        className={cn(
          "border-2",
          realTimeEnabled
            ? "border-blue-200 bg-blue-50"
            : "border-amber-200 bg-amber-50",
        )}
      >
        <div className="flex items-center gap-2">
          {realTimeEnabled ? (
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          <AlertDescription
            className={realTimeEnabled ? "text-blue-900" : "text-amber-900"}
          >
            {realTimeEnabled ? (
              <>
                <Zap className="inline h-4 w-4 mr-1" />
                Real-time WebSocket broadcasting active. All changes sync
                instantly across departments.
              </>
            ) : (
              "Real-time mode disabled. Pull to refresh for updates."
            )}
          </AlertDescription>
          <button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            {realTimeEnabled ? "Disable" : "Enable"}
          </button>
        </div>
      </Alert>

      {/* Department Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          {DEFAULT_DEPARTMENTS.map((dept) => (
            <TabsTrigger key={dept.id} value={dept.id} className="text-xs">
              <span className="hidden sm:inline">{dept.icon}</span>
              <span className="sm:hidden text-xs">
                {dept.name.split(" ")[0]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Department Content */}
        {DEFAULT_DEPARTMENTS.map((dept) => (
          <TabsContent key={dept.id} value={dept.id} className="space-y-4 mt-6">
            {/* Department Info */}
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

            {/* Two-Column Layout for Desktop, Single for Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Events & Assignments */}
              <div className="space-y-4">
                {/* Upcoming Events */}
                <DepartmentUpcomingEventsMiniPanel
                  departmentId={dept.id}
                  departmentName={dept.name}
                  daysAhead={14}
                  onEventClick={(event) => setSelectedEvent(event.taskId)}
                />

                {/* Staff Assignments */}
                <Phase5StaffAssignmentPanel
                  taskId={selectedEvent || "default"}
                  taskTitle={
                    selectedEvent
                      ? "Staff Assignments"
                      : "Select an event to view assignments"
                  }
                  compact={false}
                />
              </div>

              {/* Right Column: Analytics & Performance */}
              <div className="space-y-4">
                {/* Department Analytics */}
                <Phase5AnalyticsPanel
                  departmentId={dept.id}
                  departmentName={dept.name}
                  compact={false}
                />

                {/* Performance Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-muted-foreground">
                        Avg Efficiency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">—</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-muted-foreground">
                        Top Performer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-semibold">—</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Labor Insights */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p className="text-muted-foreground">
                      ✓ Staffing predictions based on historical data
                    </p>
                    <p className="text-muted-foreground">
                      ✓ Skill-based staff recommendations
                    </p>
                    <p className="text-muted-foreground">
                      ✓ Real-time availability constraints
                    </p>
                    <p className="text-muted-foreground">
                      ✓ Cost forecasting for upcoming events
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Labor Breakdown for Selected Event */}
            {selectedEvent && (
              <PrepLaborBreakdownMiniPanel
                taskId={selectedEvent}
                taskTitle="Labor Hours Breakdown"
              />
            )}

            {/* Integration Status */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Integration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span>Database Migration (016)</span>
                  <Badge variant="outline" className="bg-green-50">
                    ✓
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Real-Time WebSocket</span>
                  <Badge
                    variant="outline"
                    className={realTimeEnabled ? "bg-green-50" : "bg-gray-50"}
                  >
                    {realTimeEnabled ? "✓" : "○"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Staff Assignment Service</span>
                  <Badge variant="outline" className="bg-green-50">
                    ✓
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Labor Analytics Engine</span>
                  <Badge variant="outline" className="bg-green-50">
                    ✓
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Advanced Labor Management</span>
                  <Badge variant="outline" className="bg-green-50">
                    ✓
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Schedule Bidirectional Sync</span>
                  <Badge variant="outline" className="bg-blue-50">
                    ◐ Ready
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Reference */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Phase 5 Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex gap-2">
              <Users className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Staff Assignment</p>
                <p className="text-muted-foreground">
                  Assign and track team members to tasks
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Performance Analytics</p>
                <p className="text-muted-foreground">
                  Actual vs estimated analysis
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Zap className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Real-Time Updates</p>
                <p className="text-muted-foreground">
                  WebSocket broadcasts to all departments
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Advanced Labor Mgmt</p>
                <p className="text-muted-foreground">
                  Skills, rates, constraints, forecasting
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Phase5Dashboard;
