import { useState, useCallback } from "react";
import { fetchWithLucccaSession } from "../../auth";
export interface ApprovalError {
  message: string;
  code?: string;
}
export interface ApprovalRequest {
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
export interface ApprovalAction {
  id: string;
  approvalRequestId: string;
  approvedBy: string;
  approverRole: string;
  status: "approved" | "rejected" | "escalated";
  comments?: string;
  timestamp: string;
}
export function useApprovalWorkflows() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApprovalError | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const createWorkflow = useCallback(
    async (
      name: string,
      type: string,
      entityId: string,
      approverChain: any[],
      triggers?: any[],
      escalationDays?: number,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          "/api/aurum/approvals/workflow",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              type,
              entityId,
              approverChain,
              triggers,
              escalationDays,
            }),
          },
        );
        if (!res.ok)
          throw new Error(
            `Failed to create approval workflow: ${res.statusText}`,
          );
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to create approval workflow";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const submitForApproval = useCallback(
    async (
      transactionType: string,
      transactionId: string,
      transactionDetails: Record<string, any>,
      entityId?: string,
      createdBy?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          "/api/aurum/approvals/submit",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionType,
              transactionId,
              transactionDetails,
              entityId,
              createdBy,
            }),
          },
        );
        if (!res.ok)
          throw new Error(`Failed to submit for approval: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to submit for approval";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const approveRequest = useCallback(
    async (
      approvalRequestId: string,
      approverRole?: string,
      comments?: string,
      approvedBy?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          `/api/aurum/approvals/${approvalRequestId}/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              approvalRequestId,
              approverRole,
              comments,
              approvedBy,
            }),
          },
        );
        if (!res.ok)
          throw new Error(`Failed to approve request: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to approve request";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const rejectRequest = useCallback(
    async (
      approvalRequestId: string,
      rejectReason: string,
      approverRole?: string,
      rejectedBy?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          `/api/aurum/approvals/${approvalRequestId}/reject`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              approvalRequestId,
              rejectReason,
              approverRole,
              rejectedBy,
            }),
          },
        );
        if (!res.ok)
          throw new Error(`Failed to reject request: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reject request";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const delegateApproval = useCallback(
    async (
      approvalRequestId: string,
      delegateToUser: string,
      delegationReason?: string,
      delegatedBy?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          `/api/aurum/approvals/${approvalRequestId}/delegate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              approvalRequestId,
              delegateToUser,
              delegationReason,
              delegatedBy,
            }),
          },
        );
        if (!res.ok)
          throw new Error(`Failed to delegate approval: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delegate approval";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getApprovalQueue = useCallback(
    async (approverRole?: string, status?: string, type?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (approverRole) params.append("approverRole", approverRole);
        if (status) params.append("status", status);
        if (type) params.append("type", type);
        const res = await fetchWithLucccaSession(
          `/api/aurum/approvals/queue?${params.toString()}`,
        );
        if (!res.ok)
          throw new Error(`Failed to get approval queue: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get approval queue";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getApprovalDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithLucccaSession(`/api/aurum/approvals/${id}`);
      if (!res.ok)
        throw new Error(`Failed to get approval detail: ${res.statusText}`);
      const data = await res.json();
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get approval detail";
      setError({ message });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return {
    loading,
    error,
    clearError,
    createWorkflow,
    submitForApproval,
    approveRequest,
    rejectRequest,
    delegateApproval,
    getApprovalQueue,
    getApprovalDetail,
  };
}
