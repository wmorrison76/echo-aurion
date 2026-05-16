import React from "react";

import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";

interface StaffSuggestion {
  id: string;
  employeeName: string;
  role: string;
  skillLevel: number;
  performanceScore: number;
  consistency: number;
  totalScore: number;
  estimatedHours: number;
  costEstimate: number;
  reasoning: string;
}

interface EventStaffing {
  eventId: string;
  eventName: string;
  eventDate: string; /* ISO date */
  guestCount: number;
  totalHoursNeeded: number;
  suggestions: StaffSuggestion[];
  status: "pending" | "approved" | "scheduled";
}

export default function BanquetStaffScheduler() {
  const { toast } = useToast();
  const [eventStaffings, setEventStaffings] = React.useState<EventStaffing[]>(
    [],
  );
  const [loading, setLoading] = React.useState(false);

  const loadStaffing = React.useCallback(async () => {
    setLoading(true);
    try {
      const date = format(new Date(), "yyyy-MM-dd");
      const mock: EventStaffing[] = [
        {
          eventId: "event-1",
          eventName: "Wedding Reception",
          eventDate: date,
          guestCount: 150,
          totalHoursNeeded: 120,
          status: "pending",
          suggestions: [
            {
              id: "staff-1",
              employeeName: "Chef Smith",
              role: "Saucier",
              skillLevel: 5,
              performanceScore: 4.8,
              consistency: 0.95,
              totalScore: 95,
              estimatedHours: 8,
              costEstimate: 320,
              reasoning:
                "Top skill fit; strong performance and reliability for high-impact station.",
            },
          ],
        },
      ];
      setEventStaffings(mock);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadStaffing();
  }, [loadStaffing]);

  const handleApprove = React.useCallback(
    async (eventId: string) => {
      setEventStaffings((prev) =>
        prev.map((s) =>
          s.eventId === eventId ? { ...s, status: "approved" } : s,
        ),
      );
      toast({
        title: "Staffing Approved",
        description:
          "Staff schedule marked approved (wire to scheduling next).",
      });
    },
    [toast],
  );

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Banquet Staff Scheduler
              </CardTitle>
              <CardDescription>
                Performance-based staff suggestions for banquet events
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadStaffing()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {eventStaffings.map((staffing) => (
              <Card key={staffing.eventId}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {staffing.eventName}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(staffing.eventDate), "MMM d, yyyy")} •{" "}
                        {staffing.guestCount} guests •{" "}
                        {staffing.totalHoursNeeded} hours needed
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{staffing.status}</Badge>
                      {staffing.status === "pending" ? (
                        <Button
                          size="sm"
                          onClick={() => void handleApprove(staffing.eventId)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Skill</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Consistency</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffing.suggestions.map((suggestion) => (
                        <TableRow key={suggestion.id}>
                          <TableCell className="font-medium">
                            {suggestion.employeeName}
                          </TableCell>
                          <TableCell>{suggestion.role}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              {suggestion.skillLevel}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              {suggestion.performanceScore.toFixed(1)}/5
                            </div>
                          </TableCell>
                          <TableCell>
                            {(suggestion.consistency * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              {suggestion.totalScore}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {suggestion.estimatedHours}h
                            </div>
                          </TableCell>
                          <TableCell>${suggestion.costEstimate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Reasoning</p>
                    <p className="text-sm text-muted-foreground">
                      {staffing.suggestions[0]?.reasoning}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {eventStaffings.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No staffing suggestions.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
