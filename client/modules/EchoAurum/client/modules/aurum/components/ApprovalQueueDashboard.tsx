import React, { useEffect, useMemo, useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  RefreshCw,
  ChevronRight,
  Loader2,
  DollarSign,
  FileText,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApprovalWorkflows } from "../hooks/useApprovalWorkflows";
interface ApprovalCard {
  id: string;
  workflowId: string;
  transactionType: string;
  transactionId: string;
  transactionDetails: Record<string, any>;
  currentApprovalLevel: number;
  status: "pending" | "approved" | "rejected" | "escalated";
  createdAt: string;
  createdBy: string;
}
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-50 border-amber-200 text-amber-900";
    case "approved":
      return "bg-green-50 border-green-200 text-green-900";
    case "rejected":
      return "bg-red-50 border-red-200 text-red-900";
    case "escalated":
      return "bg-blue-50 border-blue-200 text-blue-900";
    default:
      return "bg-surface border-gray-200 text-gray-900";
  }
};
const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="w-4 h-4" />;
    case "approved":
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "rejected":
      return <XCircle className="w-4 h-4 text-red-600" />;
    case "escalated":
      return <AlertCircle className="w-4 h-4 text-primary" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};
const getTransactionIcon = (type: string) => {
  switch (type) {
    case "journal_entry":
      return <FileText className="w-5 h-5" />;
    case "invoice":
      return <DollarSign className="w-5 h-5" />;
    case "payment":
      return <DollarSign className="w-5 h-5" />;
    case "gl_posting":
      return <FileText className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};
const getTransactionTypeLabel = (type: string) => {
  switch (type) {
    case "journal_entry":
      return "Journal Entry";
    case "invoice":
      return "Invoice";
    case "payment":
      return "Payment";
    case "gl_posting":
      return "GL Posting";
    default:
      return type;
  }
};
interface ApprovalQueueDashboardProps {
  onApprovalSelect?: (approval: ApprovalCard) => void;
  entityId?: string;
}
export function ApprovalQueueDashboard({
  onApprovalSelect,
  entityId,
}: ApprovalQueueDashboardProps) {
  const { loading, error, getApprovalQueue } = useApprovalWorkflows();
  const [approvals, setApprovals] = useState<ApprovalCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => {
      const matchesSearch =
        approval.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        !filterType || approval.transactionType === filterType;
      const matchesStatus = !filterStatus || approval.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [approvals, searchTerm, filterType, filterStatus]);
  const summary = useMemo(
    () => ({
      pending: approvals.filter((a) => a.status === "pending").length,
      approved: approvals.filter((a) => a.status === "approved").length,
      rejected: approvals.filter((a) => a.status === "rejected").length,
      escalated: approvals.filter((a) => a.status === "escalated").length,
      total: approvals.length,
    }),
    [approvals],
  );
  const loadApprovals = async () => {
    const data = await getApprovalQueue(
      undefined,
      filterStatus !== "all" ? filterStatus : undefined,
      filterType !== "all" ? filterType : undefined,
    );
    if (data?.approvals) {
      setApprovals(data.approvals);
      setLastRefresh(new Date());
    }
  };
  useEffect(() => {
    loadApprovals();
  }, [filterStatus, filterType]);
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold text-foreground">
            Approval Queue
          </h2>{" "}
          <p className="text-sm text-muted-foreground mt-1">
            {" "}
            Manage pending approvals and review transactions{" "}
          </p>{" "}
        </div>{" "}
        <Button
          onClick={loadApprovals}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {" "}
          <RefreshCw
            className={cn("w-4 h-4", loading && "animate-spin")}
          />{" "}
          Refresh{" "}
        </Button>{" "}
      </div>{" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {" "}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          {" "}
          <div className="text-sm font-medium text-amber-900 mb-1">
            Pending
          </div>{" "}
          <div className="text-2xl font-bold text-amber-900">
            {" "}
            {summary.pending}{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          {" "}
          <div className="text-sm font-medium text-green-900 mb-1">
            {" "}
            Approved{" "}
          </div>{" "}
          <div className="text-2xl font-bold text-green-900">
            {" "}
            {summary.approved}{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          {" "}
          <div className="text-sm font-medium text-red-900 mb-1">
            Rejected
          </div>{" "}
          <div className="text-2xl font-bold text-red-900">
            {" "}
            {summary.rejected}{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          {" "}
          <div className="text-sm font-medium text-blue-900 mb-1">
            {" "}
            Escalated{" "}
          </div>{" "}
          <div className="text-2xl font-bold text-blue-900">
            {" "}
            {summary.escalated}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Filters */}{" "}
      <div className="bg-surface rounded-lg border border-border p-4 space-y-4">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <Filter className="w-4 h-4 text-muted-foreground" />{" "}
          <span className="text-sm font-medium text-foreground">
            Filters
          </span>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {" "}
          <div className="space-y-2">
            {" "}
            <label className="text-sm font-medium text-foreground">
              {" "}
              Search{" "}
            </label>{" "}
            <Input
              placeholder="Search by ID, submitter, or transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <label className="text-sm font-medium text-foreground">
              Type
            </label>{" "}
            <Select value={filterType} onValueChange={setFilterType}>
              {" "}
              <SelectTrigger className="h-9">
                {" "}
                <SelectValue placeholder="All types" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">All types</SelectItem>{" "}
                <SelectItem value="journal_entry">Journal Entry</SelectItem>{" "}
                <SelectItem value="invoice">Invoice</SelectItem>{" "}
                <SelectItem value="payment">Payment</SelectItem>{" "}
                <SelectItem value="gl_posting">GL Posting</SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <label className="text-sm font-medium text-foreground">
              {" "}
              Status{" "}
            </label>{" "}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              {" "}
              <SelectTrigger className="h-9">
                {" "}
                <SelectValue placeholder="All statuses" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">All statuses</SelectItem>{" "}
                <SelectItem value="pending">Pending</SelectItem>{" "}
                <SelectItem value="approved">Approved</SelectItem>{" "}
                <SelectItem value="rejected">Rejected</SelectItem>{" "}
                <SelectItem value="escalated">Escalated</SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Error State */}{" "}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          {" "}
          <div className="flex gap-3">
            {" "}
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />{" "}
            <div>
              {" "}
              <h3 className="font-semibold text-red-900">
                {" "}
                Error loading approvals{" "}
              </h3>{" "}
              <p className="text-sm text-red-800 mt-1">{error.message}</p>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Loading State */}{" "}
      {loading && (
        <div className="space-y-3">
          {" "}
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}{" "}
        </div>
      )}{" "}
      {/* Approvals List */}{" "}
      {!loading && filteredApprovals.length > 0 && (
        <div className="space-y-3">
          {" "}
          {filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              className={cn(
                "border rounded-lg p-4 transition-colors cursor-pointer hover:bg-muted/50",
                getStatusColor(approval.status),
              )}
              onClick={() => onApprovalSelect?.(approval)}
            >
              {" "}
              <div className="flex items-start justify-between">
                {" "}
                <div className="flex items-start gap-4 flex-1">
                  {" "}
                  <div className="flex-shrink-0 pt-1">
                    {" "}
                    {getTransactionIcon(approval.transactionType)}{" "}
                  </div>{" "}
                  <div className="flex-1 min-w-0">
                    {" "}
                    <div className="flex items-center gap-2 mb-2">
                      {" "}
                      <h3 className="font-semibold text-foreground">
                        {" "}
                        {getTransactionTypeLabel(approval.transactionType)}{" "}
                      </h3>{" "}
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        {" "}
                        {getStatusIcon(approval.status)}{" "}
                        {approval.status.charAt(0).toUpperCase() +
                          approval.status.slice(1)}{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {" "}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {" "}
                        <FileText className="w-4 h-4" />{" "}
                        <span className="truncate">
                          {" "}
                          {approval.transactionId}{" "}
                        </span>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {" "}
                        <User className="w-4 h-4" />{" "}
                        <span className="truncate">
                          {approval.createdBy}
                        </span>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {" "}
                        <Calendar className="w-4 h-4" />{" "}
                        <span>{formatDate(approval.createdAt)}</span>{" "}
                      </div>{" "}
                    </div>{" "}
                    {approval.transactionDetails.amount && (
                      <div className="mt-2 flex items-center gap-2 text-foreground font-semibold">
                        {" "}
                        <DollarSign className="w-4 h-4" />{" "}
                        {formatCurrency(
                          approval.transactionDetails.amount,
                        )}{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex-shrink-0 ml-4">
                  {" "}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>
      )}{" "}
      {/* Empty State */}{" "}
      {!loading && filteredApprovals.length === 0 && (
        <div className="text-center py-12">
          {" "}
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />{" "}
          <h3 className="font-semibold text-foreground mb-1">
            {" "}
            No approvals found{" "}
          </h3>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            {approvals.length === 0
              ? "No approvals in the system yet."
              : "No approvals match your current filters."}{" "}
          </p>{" "}
        </div>
      )}{" "}
      {/* Last Refresh */}{" "}
      <div className="text-xs text-muted-foreground text-center">
        {" "}
        Last refreshed: {lastRefresh.toLocaleTimeString()}{" "}
      </div>{" "}
    </div>
  );
}
