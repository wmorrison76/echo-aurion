import { useMemo, useState } from "react";
import { CheckCircle2, Clock, TriangleAlert, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "escalated";

export interface ApprovalItem {
  id: string;
  type: "purchase-order" | "transfer" | "recipe" | "automation";
  reference: string;
  submittedBy: string;
  submittedAt: string;
  amount?: number;
  status: ApprovalStatus;
  riskScore?: number;
  notes?: string;
}

export interface ApprovalsConsoleProps {
  items?: ApprovalItem[];
  loadingIds?: string[];
  onApprove?: (id: string) => Promise<void> | void;
  onReject?: (id: string) => Promise<void> | void;
  onEscalate?: (id: string) => Promise<void> | void;
}

const statusMeta: Record<ApprovalStatus, { label: string; tone: string; icon: JSX.Element }> = {
  pending: {
    label: "Pending",
    tone: "bg-amber-400/15 text-amber-600",
    icon: <Clock className="h-4 w-4" aria-hidden />,
  },
  approved: {
    label: "Approved",
    tone: "bg-emerald-500/10 text-emerald-600",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  rejected: {
    label: "Rejected",
    tone: "bg-destructive/10 text-destructive",
    icon: <XCircle className="h-4 w-4" aria-hidden />,
  },
  escalated: {
    label: "Escalated",
    tone: "bg-sky-500/15 text-sky-600",
    icon: <TriangleAlert className="h-4 w-4" aria-hidden />,
  },
};

const typeLabels: Record<ApprovalItem["type"], string> = {
  "purchase-order": "Purchase Order",
  transfer: "Inventory Transfer",
  recipe: "Recipe Change",
  automation: "Automation",
};

export function ApprovalsConsole({
  items = [],
  loadingIds = [],
  onApprove,
  onReject,
  onEscalate,
}: ApprovalsConsoleProps) {
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("pending");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "pending").length,
    [items],
  );

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Approvals Console</CardTitle>
            <CardDescription>
              Manage purchase orders, transfers, and recipe updates that require
              human oversight before execution.
            </CardDescription>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-500">
            {pendingCount} pending
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApprovalStatus | "all") }>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">
            Tip: Echo prepares orders, but a human must confirm before send.
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No items match the current filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const meta = statusMeta[item.status];
                const loading = loadingIds.includes(item.id);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.reference}</div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {new Date(item.submittedAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>{typeLabels[item.type]}</TableCell>
                    <TableCell>
                      <Badge className={cn("inline-flex items-center gap-2", meta.tone)}>
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.submittedBy}</TableCell>
                    <TableCell>
                      {typeof item.riskScore === "number" ? (
                        <Badge
                          className={cn(
                            "font-mono",
                            item.riskScore > 70
                              ? "bg-destructive/10 text-destructive"
                              : item.riskScore > 40
                                ? "bg-amber-400/15 text-amber-600"
                                : "bg-emerald-500/10 text-emerald-600",
                          )}
                        >
                          {item.riskScore}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={item.status !== "pending" || loading}
                        onClick={() => onEscalate?.(item.id)}
                      >
                        Escalate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={item.status !== "pending" || loading}
                        onClick={() => onReject?.(item.id)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={item.status !== "pending" || loading}
                        onClick={() => onApprove?.(item.id)}
                      >
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
