/**
 * BEO Schedule Integration Component
 *
 * Seamless integration from BEO creation to schedule generation
 * Automatically analyzes BEO and generates optimal schedule
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Users,
  Calendar,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";
import { AIScheduleGeneratorPanel } from "../ai-schedule-generator/AIScheduleGeneratorPanel";

interface BEOAnalysis {
  eventId: string;
  beoId: string;
  eventDate: string;
  guestCount: number;
  serviceType: "plated" | "buffet" | "family_style" | "cocktail";
  staffingNeeds: Array<{
    role: string;
    count: number;
    startTime: string;
    endTime: string;
  }>;
  departments: {
    culinary: { totalStaff: number; totalHours: number };
    pastry: { totalStaff: number; totalHours: number };
    service: { totalStaff: number; totalHours: number };
    stewards: { totalStaff: number; totalHours: number };
  };
  totalStaff: number;
  totalHours: number;
  confidence: number;
}

function BEOScheduleIntegration({
  beoId,
  eventId,
}: {
  beoId?: string;
  eventId?: string;
}) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = React.useState<BEOAnalysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("analysis");

  React.useEffect(() => {
    if (beoId || eventId) {
      loadAnalysis();
    }
  }, [beoId, eventId]);

  const loadAnalysis = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/performance/beo-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, beoId }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.data);
      } else {
        throw new Error(data.error || "Failed to analyze BEO");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze BEO",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            BEO → Schedule Integration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatic schedule generation from BEO/REO analysis
          </p>
        </div>
        <Button onClick={loadAnalysis} disabled={loading || !eventId}>
          <RefreshCw
            className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
          />
          Refresh Analysis
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">BEO Analysis</TabsTrigger>
          <TabsTrigger value="schedule">Generate Schedule</TabsTrigger>
          <TabsTrigger value="review">Review & Approve</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4 mt-4">
          {analysis ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      Total Staff Needed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {analysis.totalStaff}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      Total Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {analysis.totalHours}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      Guest Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {analysis.guestCount}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      Confidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {analysis.confidence}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        Culinary
                      </h3>
                      <p className="text-2xl font-bold text-foreground">
                        {analysis.departments.culinary.totalStaff}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.departments.culinary.totalHours} hours
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        Pastry
                      </h3>
                      <p className="text-2xl font-bold text-foreground">
                        {analysis.departments.pastry.totalStaff}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.departments.pastry.totalHours} hours
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        Service
                      </h3>
                      <p className="text-2xl font-bold text-foreground">
                        {analysis.departments.service.totalStaff}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.departments.service.totalHours} hours
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        Stewards
                      </h3>
                      <p className="text-2xl font-bold text-foreground">
                        {analysis.departments.stewards.totalStaff}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.departments.stewards.totalHours} hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Staffing Needs */}
              <Card>
                <CardHeader>
                  <CardTitle>Staffing Requirements</CardTitle>
                  <CardDescription>
                    Roles and counts needed for this event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.staffingNeeds.map((need, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-foreground">
                            {need.role}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(need.startTime), "h:mm a")} -{" "}
                            {format(new Date(need.endTime), "h:mm a")}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {need.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Step */}
              <Alert>
                <ArrowRight className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">
                    Ready to Generate Schedule
                  </div>
                  <p className="text-sm">
                    Click "Generate Schedule" to automatically assign staff
                    based on skills, performance, and preferences.
                  </p>
                  <Button
                    className="mt-3"
                    onClick={() => setActiveTab("schedule")}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Schedule
                  </Button>
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Analyzing BEO...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {eventId
                        ? 'Click "Refresh Analysis" to analyze BEO'
                        : "Enter Event ID to begin"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <AIScheduleGeneratorPanel />
        </TabsContent>

        <TabsContent value="review" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Review</CardTitle>
              <CardDescription>
                Review and approve the generated schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Schedule review interface will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BEOScheduleIntegration;
export { BEOScheduleIntegration };
