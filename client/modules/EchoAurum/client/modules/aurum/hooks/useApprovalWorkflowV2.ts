/** * useApprovalWorkflowV2 Hook * Enhanced approval workflow management with escalation, delegation, and auto-post */ import {
  useState,
  useEffect,
  useCallback,
} from "react";
import { fetchWithLucccaSession } from "../../auth";
export interface ApprovalWorkflow {
  id: string;
  entryId: string;
  entityId: string;
  requiredAction: string;
  status: "pending" | "approved" | "rejected" | "escalated" | "delegated";
  approverName: string;
  createdAt: string;
  updatedAt: string;
  escalationLevel: number;
  guardianStatus: "pending" | "passed" | "failed";
  comments: number;
  canAutoPost: boolean;
}
interface UseApprovalWorkflowV2Props {
  entityId?: string;
  approvalId?: string;
}
export function useApprovalWorkflowV2({
  entityId,
  approvalId,
}: UseApprovalWorkflowV2Props = {}) {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [currentApproval, setCurrentApproval] =
    useState<ApprovalWorkflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Fetch all workflows for an entity const fetchWorkflows = useCallback(async () => { if (!entityId) return; setLoading(true); setError(null); try { const response = await fetchWithLucccaSession( `/api/aurum/approvals?entityId=${entityId}`, ); if (!response.ok) { throw new Error("Failed to fetch workflows"); } const data: ApprovalWorkflow[] = await response.json(); setWorkflows(data); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [entityId]); // Fetch specific approval const fetchApproval = useCallback(async () => { if (!approvalId) return; setLoading(true); setError(null); try { const response = await fetchWithLucccaSession( `/api/aurum/approvals/${approvalId}`, ); if (!response.ok) { throw new Error("Failed to fetch approval"); } const data: ApprovalWorkflow = await response.json(); setCurrentApproval(data); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [approvalId]); // Approve workflow const approve = useCallback( async (comment?: string) => { if (!approvalId) return; try { const response = await fetchWithLucccaSession( `/api/aurum/approvals/${approvalId}/approve`, { method:"POST", body: JSON.stringify({ comment }), }, ); if (!response.ok) { throw new Error("Failed to approve"); } await fetchApproval(); if (entityId) await fetchWorkflows(); return true; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return false; } }, [approvalId, entityId, fetchApproval, fetchWorkflows], ); // Reject workflow const reject = useCallback( async (reason: string) => { if (!approvalId) return; try { const response = await fetchWithLucccaSession( `/api/aurum/approvals/${approvalId}/reject`, { method:"POST", body: JSON.stringify({ reason }), }, ); if (!response.ok) { throw new Error("Failed to reject"); } await fetchApproval(); if (entityId) await fetchWorkflows(); return true; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return false; } }, [approvalId, entityId, fetchApproval, fetchWorkflows], ); // Escalate workflow const escalate = useCallback(async () => { if (!approvalId) return; try { const response = await fetchWithLucccaSession( `/api/aurum/approvals/${approvalId}/escalate`, { method:"POST" }, ); if (!response.ok) { throw new Error("Failed to escalate"); } await fetchApproval(); if (entityId) await fetchWorkflows(); return true; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return false; } }, [approvalId, entityId, fetchApproval, fetchWorkflows]); // Delegate workflow const delegate = useCallback( async (toApproverId: string, reason: string) => { if (!approvalId) return; try { const response = await fetchWithLucccaSession( `/api/aurum/approvals/${approvalId}/delegate`, { method:"POST", body: JSON.stringify({ toApproverId, reason }), }, ); if (!response.ok) { throw new Error("Failed to delegate"); } await fetchApproval(); if (entityId) await fetchWorkflows(); return true; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return false; } }, [approvalId, entityId, fetchApproval, fetchWorkflows], ); // Refresh data const refresh = useCallback(() => { if (approvalId) { fetchApproval(); } else if (entityId) { fetchWorkflows(); } }, [approvalId, entityId, fetchApproval, fetchWorkflows]); // Initial fetch useEffect(() => { if (approvalId) { fetchApproval(); } else if (entityId) { fetchWorkflows(); } }, [entityId, approvalId, fetchApproval, fetchWorkflows]); return { workflows, currentApproval, loading, error, approve, reject, escalate, delegate, refresh, };
}
