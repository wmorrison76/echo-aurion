/**
 * Job Share Management Dashboard
 *
 * Manages job share postings, Chef approvals, and assignments
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Send,
  RefreshCw,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface JobSharePosting {
  opportunity: {
    id: string;
    date: string;
    role: string;
    roleName: string;
    shiftStart: string;
    shiftEnd: string;
    duration: number;
    priority: "critical" | "high" | "medium" | "low";
    status: "draft" | "posted" | "filled" | "cancelled";
    chefApproved: boolean;
  };
  applications: Array<{
    id: string;
    employeeName: string;
    appliedAt: string;
    status: string;
  }>;
  status: string;
}

function JobShareManagement() {
  const { toast } = useToast();
  const [postings, setPostings] = React.useState<JobSharePosting[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState({
    status: "all",
    date: "",
    role: "all",
  });

  React.useEffect(() => {
    loadPostings();
  }, [filter]);

  const loadPostings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status !== "all") params.append("status", filter.status);
      if (filter.date) params.append("date", filter.date);
      if (filter.role !== "all") params.append("role", filter.role);

      const response = await fetch(
        `/api/scheduling/job-share/list?${params.toString()}`,
      );
      const data = await response.json();

      if (data.success) {
        setPostings(data.data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load job shares",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChefApprove = async (opportunityId: string) => {
    try {
      const response = await fetch("/api/scheduling/job-share/chef-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          chefId: "chef-123", // In production, get from auth
          chefName: "Chef Smith",
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Approved",
          description: "Job share approved and posted",
        });
        loadPostings();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve",
        variant: "destructive",
      });
    }
  };

  const handleChefReject = async (opportunityId: string, reason: string) => {
    try {
      const response = await fetch("/api/scheduling/job-share/chef-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          chefId: "chef-123",
          reason,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Rejected",
          description: "Job share rejected",
        });
        loadPostings();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject",
        variant: "destructive",
      });
    }
  };

  const handleAssign = async (opportunityId: string, applicationId: string) => {
    try {
      const response = await fetch("/api/scheduling/job-share/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          applicationId,
          assignedBy: "manager-123", // In production, get from auth
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Assigned",
          description: "Employee assigned to job share",
        });
        loadPostings();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign",
        variant: "destructive",
      });
    }
  };

  const pendingApproval = postings.filter(
    (p) => p.status === "pending_chef_approval",
  );
  const posted = postings.filter((p) => p.status === "posted");
  const filled = postings.filter((p) => p.status === "filled");

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-primary" />
            Job Share Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage job share postings, Chef approvals, and assignments
          </p>
        </div>
        <Button onClick={loadPostings} disabled={loading}>
          <RefreshCw
            className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={filter.status}
                onValueChange={(v) => setFilter({ ...filter, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_chef_approval">
                    Pending Approval
                  </SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={filter.role}
                onValueChange={(v) => setFilter({ ...filter, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="runner">Food Runner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() =>
                  setFilter({ status: "all", date: "", role: "all" })
                }
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingApproval.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {posted.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Filled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filled.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Postings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Share Postings</CardTitle>
          <CardDescription>{postings.length} posting(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postings.map((posting) => (
                <TableRow key={posting.opportunity.id}>
                  <TableCell>
                    {format(new Date(posting.opportunity.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {posting.opportunity.roleName}
                  </TableCell>
                  <TableCell>
                    {format(new Date(posting.opportunity.shiftStart), "h:mm a")}{" "}
                    - {format(new Date(posting.opportunity.shiftEnd), "h:mm a")}
                  </TableCell>
                  <TableCell>{posting.opportunity.duration}h</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        posting.opportunity.priority === "critical"
                          ? "destructive"
                          : posting.opportunity.priority === "high"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {posting.opportunity.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{posting.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {posting.applications.length > 0 ? (
                      <Badge variant="default">
                        {posting.applications.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {posting.status === "pending_chef_approval" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              handleChefApprove(posting.opportunity.id)
                            }
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleChefReject(
                                posting.opportunity.id,
                                "Not needed",
                              )
                            }
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {posting.status === "posted" &&
                        posting.applications.length > 0 && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAssign(
                                posting.opportunity.id,
                                posting.applications[0].id,
                              )
                            }
                          >
                            Assign
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobShareManagement;
export { JobShareManagement };
