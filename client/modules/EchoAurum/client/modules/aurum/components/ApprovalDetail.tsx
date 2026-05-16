import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  ChevronLeft,
  MessageSquare,
  Clock,
  User,
  FileText,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApprovalWorkflows } from "../hooks/useApprovalWorkflows";
interface ApprovalRequest {
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
interface ApprovalHistory {
  action: string;
  by: string;
  role: string;
  at: string;
  comments?: string;
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
    hour: "2-digit",
    minute: "2-digit",
  });
};
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "approved":
      return "bg-green-100 text-green-900 border-green-300";
    case "rejected":
      return "bg-red-100 text-red-900 border-red-300";
    case "escalated":
      return "bg-blue-100 text-blue-900 border-primary";
    default:
      return "bg-surface text-gray-900 border-border";
  }
};
const getActionColor = (action: string) => {
  if (action.includes("Approved"))
    return "bg-green-50 border-green-200 text-green-900";
  if (action.includes("Rejected"))
    return "bg-red-50 border-red-200 text-red-900";
  if (action.includes("Escalated"))
    return "bg-blue-50 border-blue-200 text-blue-900";
  return "bg-surface border-gray-200 text-gray-900";
};
interface ApprovalDetailProps {
  approvalId: string;
  onBack?: () => void;
}
export function ApprovalDetail({ approvalId, onBack }: ApprovalDetailProps) {
  const {
    loading,
    error,
    getApprovalDetail,
    approveRequest,
    rejectRequest,
    delegateApproval,
  } = useApprovalWorkflows();
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [history, setHistory] = useState<ApprovalHistory[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [delegateUser, setDelegateUser] = useState("");
  const [activeAction, setActiveAction] = useState<
    "view" | "approve" | "reject" | "delegate"
  >("view");
  const loadDetail = async () => {
    const data = await getApprovalDetail(approvalId);
    if (data?.approvalRequest) {
      setApproval(data.approvalRequest);
      setHistory(data.approvalHistory || []);
    }
  };
  useEffect(() => {
    loadDetail();
  }, [approvalId]);
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const result = await approveRequest(
        approvalId,
        "manager",
        approvalComments,
      );
      if (result) {
        setApprovalComments("");
        setActiveAction("view");
        await loadDetail();
      }
    } finally {
      setActionLoading(false);
    }
  };
  const handleReject = async () => {
    setActionLoading(true);
    try {
      const result = await rejectRequest(
        approvalId,
        rejectionReason,
        "manager",
      );
      if (result) {
        setRejectionReason("");
        setActiveAction("view");
        await loadDetail();
      }
    } finally {
      setActionLoading(false);
    }
  };
  const handleDelegate = async () => {
    setActionLoading(true);
    try {
      const result = await delegateApproval(approvalId, delegateUser);
      if (result) {
        setDelegateUser("");
        setActiveAction("view");
        await loadDetail();
      }
    } finally {
      setActionLoading(false);
    }
  };
  if (loading && !approval) {
    return (
      <div className="flex items-center justify-center py-12">
        {" "}
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />{" "}
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        {" "}
        <div className="flex gap-3">
          {" "}
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />{" "}
          <div>
            {" "}
            <h3 className="font-semibold text-red-900">
              Error loading approval
            </h3>{" "}
            <p className="text-sm text-red-800 mt-1">{error.message}</p>{" "}
            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
              >
                {" "}
                <ChevronLeft className="w-4 h-4" /> Back{" "}
              </Button>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  }
  if (!approval) {
    return (
      <div className="text-center py-12">
        {" "}
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />{" "}
        <h3 className="font-semibold text-foreground mb-1">
          Approval not found
        </h3>{" "}
        <p className="text-sm text-muted-foreground mb-4">
          The approval request could not be found.
        </p>{" "}
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {" "}
            <ChevronLeft className="w-4 h-4" /> Back{" "}
          </Button>
        )}{" "}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center gap-4">
        {" "}
        {onBack && (
          <Button onClick={onBack} variant="ghost" size="sm" className="gap-2">
            {" "}
            <ChevronLeft className="w-4 h-4" />{" "}
          </Button>
        )}{" "}
        <div className="flex-1">
          {" "}
          <div className="flex items-center gap-3 mb-2">
            {" "}
            <h2 className="text-2xl font-bold text-foreground">
              Approval Request
            </h2>{" "}
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border",
                getStatusColor(approval.status),
              )}
            >
              {" "}
              {approval.status.charAt(0).toUpperCase() +
                approval.status.slice(1)}{" "}
            </span>{" "}
          </div>{" "}
          <p className="text-sm text-muted-foreground">
            ID: {approval.id}
          </p>{" "}
        </div>{" "}
      </div>{" "}
      {/* Transaction Details */}{" "}
      <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
        {" "}
        <h3 className="font-semibold text-foreground">
          Transaction Details
        </h3>{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {" "}
          <div>
            {" "}
            <label className="text-sm font-medium text-muted-foreground">
              Type
            </label>{" "}
            <p className="text-foreground font-medium mt-1">
              {approval.transactionType}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-sm font-medium text-muted-foreground">
              Transaction ID
            </label>{" "}
            <p className="text-foreground font-medium mt-1">
              {approval.transactionId}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-sm font-medium text-muted-foreground">
              Submitted By
            </label>{" "}
            <p className="text-foreground font-medium mt-1">
              {approval.createdBy}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="text-sm font-medium text-muted-foreground">
              Submitted Date
            </label>{" "}
            <p className="text-foreground font-medium mt-1">
              {formatDate(approval.createdAt)}
            </p>{" "}
          </div>{" "}
          {approval.transactionDetails.amount && (
            <div>
              {" "}
              <label className="text-sm font-medium text-muted-foreground">
                Amount
              </label>{" "}
              <p className="text-foreground font-bold mt-1 text-lg">
                {" "}
                {formatCurrency(approval.transactionDetails.amount)}{" "}
              </p>{" "}
            </div>
          )}{" "}
          {approval.transactionDetails.description && (
            <div className="md:col-span-2">
              {" "}
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>{" "}
              <p className="text-foreground mt-1">
                {approval.transactionDetails.description}
              </p>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Approval Chain */}{" "}
      <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
        {" "}
        <h3 className="font-semibold text-foreground">Approval Chain</h3>{" "}
        <div className="space-y-3">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-aurum-500 text-white text-sm font-bold">
              {" "}
              1{" "}
            </div>{" "}
            <div className="flex-1">
              {" "}
              <p className="text-sm font-medium text-foreground">
                Level 1 - Manager Approval
              </p>{" "}
              <p className="text-xs text-muted-foreground mt-1">
                Current level
              </p>{" "}
            </div>{" "}
            {approval.status === "approved" && (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}{" "}
            {approval.status === "rejected" && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}{" "}
            {approval.status === "pending" && (
              <Clock className="w-5 h-5 text-amber-600" />
            )}{" "}
          </div>{" "}
          {approval.currentApprovalLevel > 1 && (
            <>
              {" "}
              <div className="ml-3 h-8 border-l-2 border-muted"></div>{" "}
              <div className="flex items-center gap-3">
                {" "}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-muted-foreground text-sm font-bold">
                  {" "}
                  2{" "}
                </div>{" "}
                <div className="flex-1">
                  {" "}
                  <p className="text-sm font-medium text-foreground">
                    Level 2 - Director Approval
                  </p>{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Approval History */}{" "}
      {history.length > 0 && (
        <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
          {" "}
          <h3 className="font-semibold text-foreground">
            Approval History
          </h3>{" "}
          <div className="space-y-4">
            {" "}
            {history.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "border rounded-lg p-4 space-y-2",
                  getActionColor(item.action),
                )}
              >
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div>
                    {" "}
                    <p className="font-semibold">{item.action}</p>{" "}
                    <p className="text-sm mt-1">{item.by}</p>{" "}
                  </div>{" "}
                  <span className="text-xs text-muted-foreground">
                    {item.role}
                  </span>{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground">{item.at}</p>{" "}
                {item.comments && (
                  <p className="text-sm mt-2 italic">"{item.comments}"</p>
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Action Section */}{" "}
      {approval.status === "pending" && (
        <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
          {" "}
          <h3 className="font-semibold text-foreground">Your Action</h3>{" "}
          {activeAction === "view" && (
            <div className="flex gap-3">
              {" "}
              <Button
                onClick={() => setActiveAction("approve")}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {" "}
                <CheckCircle2 className="w-4 h-4" /> Approve{" "}
              </Button>{" "}
              <Button
                onClick={() => setActiveAction("reject")}
                variant="outline"
                className="gap-2"
              >
                {" "}
                <XCircle className="w-4 h-4" /> Reject{" "}
              </Button>{" "}
              <Button
                onClick={() => setActiveAction("delegate")}
                variant="outline"
                className="gap-2"
              >
                {" "}
                <ArrowRight className="w-4 h-4" /> Delegate{" "}
              </Button>{" "}
            </div>
          )}{" "}
          {activeAction === "approve" && (
            <div className="space-y-4 border-t pt-4">
              {" "}
              <div className="space-y-2">
                {" "}
                <label className="text-sm font-medium text-foreground">
                  Comments (Optional)
                </label>{" "}
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Add approval comments..."
                  className="w-full h-24 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                />{" "}
              </div>{" "}
              <div className="flex gap-3">
                {" "}
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {" "}
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}{" "}
                  Submit Approval{" "}
                </Button>{" "}
                <Button
                  onClick={() => setActiveAction("view")}
                  variant="outline"
                  disabled={actionLoading}
                >
                  {" "}
                  Cancel{" "}
                </Button>{" "}
              </div>{" "}
            </div>
          )}{" "}
          {activeAction === "reject" && (
            <div className="space-y-4 border-t pt-4">
              {" "}
              <div className="space-y-2">
                {" "}
                <label className="text-sm font-medium text-foreground">
                  Rejection Reason
                </label>{" "}
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why you are rejecting this request..."
                  className="w-full h-24 px-3 py-2 border border-border rounded-md text-foreground bg-background"
                />{" "}
              </div>{" "}
              <div className="flex gap-3">
                {" "}
                <Button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason}
                  variant="destructive"
                  className="gap-2"
                >
                  {" "}
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}{" "}
                  Submit Rejection{" "}
                </Button>{" "}
                <Button
                  onClick={() => setActiveAction("view")}
                  variant="outline"
                  disabled={actionLoading}
                >
                  {" "}
                  Cancel{" "}
                </Button>{" "}
              </div>{" "}
            </div>
          )}{" "}
          {activeAction === "delegate" && (
            <div className="space-y-4 border-t pt-4">
              {" "}
              <div className="space-y-2">
                {" "}
                <label className="text-sm font-medium text-foreground">
                  Delegate To
                </label>{" "}
                <Input
                  value={delegateUser}
                  onChange={(e) => setDelegateUser(e.target.value)}
                  placeholder="Enter user ID or email..."
                  className="h-9"
                />{" "}
              </div>{" "}
              <div className="flex gap-3">
                {" "}
                <Button
                  onClick={handleDelegate}
                  disabled={actionLoading || !delegateUser}
                  className="gap-2"
                >
                  {" "}
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}{" "}
                  Delegate{" "}
                </Button>{" "}
                <Button
                  onClick={() => setActiveAction("view")}
                  variant="outline"
                  disabled={actionLoading}
                >
                  {" "}
                  Cancel{" "}
                </Button>{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
    </div>
  );
}
