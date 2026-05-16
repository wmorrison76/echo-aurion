/**
 * Employee History View
 *
 * Secure view of employee history with encrypted data
 * Role-based access control for sensitive information
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Shield,
  Lock,
  Calendar,
  TrendingUp,
  FileText,
  Award,
  AlertTriangle,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface EmployeeHistoryEntry {
  id: string;
  entryType:
    | "evaluation"
    | "performance_review"
    | "training"
    | "incident"
    | "achievement"
    | "promotion";
  eventId?: string;
  date: string;
  title: string;
  description: string;
  data: Record<string, any>;
  createdBy: string;
}

interface EmployeeHistorySummary {
  employeeId: string;
  totalEntries: number;
  evaluations: number;
  performanceReviews: number;
  training: number;
  incidents: number;
  achievements: number;
  promotions: number;
  lastUpdated: string;
  averageRating: number;
  trend: "improving" | "stable" | "declining";
}

interface EmployeeHistoryViewProps {
  employeeId: string;
  employeeName: string;
  canViewSensitive?: boolean;
}

export function EmployeeHistoryView({
  employeeId,
  employeeName,
  canViewSensitive = false,
}: EmployeeHistoryViewProps) {
  const { toast } = useToast();
  const [history, setHistory] = React.useState<EmployeeHistoryEntry[]>([]);
  const [summary, setSummary] = React.useState<EmployeeHistorySummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadHistory();
  }, [employeeId, canViewSensitive]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/performance/history/${employeeId}?includeSensitive=${canViewSensitive}`,
      );
      const data = await response.json();

      if (data.success) {
        setHistory(data.data || []);
      }

      // Load summary
      const summaryResponse = await fetch(
        `/api/performance/history/${employeeId}/summary`,
      );
      const summaryData = await summaryResponse.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load employee history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEntryIcon = (type: EmployeeHistoryEntry["entryType"]) => {
    switch (type) {
      case "evaluation":
        return <FileText className="w-4 h-4" />;
      case "performance_review":
        return <TrendingUp className="w-4 h-4" />;
      case "training":
        return <GraduationCap className="w-4 h-4" />;
      case "incident":
        return <AlertTriangle className="w-4 h-4" />;
      case "achievement":
        return <Award className="w-4 h-4" />;
      case "promotion":
        return <Briefcase className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEntryColor = (type: EmployeeHistoryEntry["entryType"]) => {
    switch (type) {
      case "evaluation":
        return "bg-blue-500/20 text-blue-600";
      case "performance_review":
        return "bg-purple-500/20 text-purple-600";
      case "training":
        return "bg-green-500/20 text-green-600";
      case "incident":
        return "bg-red-500/20 text-red-600";
      case "achievement":
        return "bg-yellow-500/20 text-yellow-600";
      case "promotion":
        return "bg-indigo-500/20 text-indigo-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const selectedEntryData = selectedEntry
    ? history.find((e) => e.id === selectedEntry)
    : null;

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <User className="w-8 h-8 text-primary" />
            Employee History: {employeeName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete employment history with encrypted sensitive data
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canViewSensitive ? (
            <Badge variant="outline" className="px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Full Access
            </Badge>
          ) : (
            <Badge variant="outline" className="px-3 py-1">
              <Lock className="w-3 h-3 mr-1" />
              Limited Access
            </Badge>
          )}
        </div>
      </div>

      {!canViewSensitive && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You have limited access. Sensitive information (pay rates, bonuses,
            etc.) is encrypted and only visible to authorized personnel.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {summary.totalEntries}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {summary.evaluations}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Avg Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {summary.averageRating.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {summary.trend === "improving" ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : summary.trend === "declining" ? (
                  <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />
                ) : (
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-lg font-bold text-foreground capitalize">
                  {summary.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* History List */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">History Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry.id)}
                    className={cn(
                      "w-full text-left p-3 border-b border-border hover:bg-surface transition-colors",
                      selectedEntry === entry.id &&
                        "bg-primary/10 border-l-4 border-l-primary",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "p-1 rounded",
                          getEntryColor(entry.entryType),
                        )}
                      >
                        {getEntryIcon(entry.entryType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {entry.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {entry.entryType.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entry Details */}
        <div className="col-span-2">
          {selectedEntryData ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedEntryData.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(selectedEntryData.date), "PPP")} •{" "}
                      {selectedEntryData.entryType.replace("_", " ")}
                    </CardDescription>
                  </div>
                  <div
                    className={cn(
                      "p-2 rounded",
                      getEntryColor(selectedEntryData.entryType),
                    )}
                  >
                    {getEntryIcon(selectedEntryData.entryType)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedEntryData.description === "[Encrypted]" ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        This content is encrypted and requires authorization to
                        view
                      </span>
                    ) : (
                      selectedEntryData.description
                    )}
                  </p>
                </div>

                {Object.keys(selectedEntryData.data).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Details
                    </h3>
                    <Table>
                      <TableBody>
                        {Object.entries(selectedEntryData.data).map(
                          ([key, value]) => (
                            <TableRow key={key}>
                              <TableCell className="font-medium text-foreground">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {!canViewSensitive &&
                  selectedEntryData.description === "[Encrypted]" && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Request access from HR or management to view encrypted
                        content
                      </AlertDescription>
                    </Alert>
                  )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select an entry from the timeline to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
