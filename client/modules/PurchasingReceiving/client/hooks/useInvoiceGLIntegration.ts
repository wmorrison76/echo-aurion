import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
interface ExtractionResult {
  id: string;
  invoiceId: string;
  extractionTimestamp: string;
  extractionMethod: "ocr" | "api" | "manual" | "edi";
  ocrConfidenceOverall?: number;
  extractedNumber?: string;
  extractedDate?: string;
  extractedVendorName?: string;
  extractedSubtotal?: number;
  extractedTax?: number;
  extractedTotal?: number;
  extractedLineCount?: number;
  lineExtractionStatus:
    | "pending"
    | "processing"
    | "completed"
    | "partial"
    | "failed";
  varianceDetected?: boolean;
  createdAt: string;
}
interface GLAllocation {
  id: string;
  invoiceId: string;
  invoiceLineId?: string;
  outletId: string;
  glCodeId: string;
  glCode: string;
  allocationType: "invoice_line" | "proportional" | "manual" | "auto_mapped";
  allocatedAmount: number;
  allocationPercentage?: number;
  postingStatus: "pending" | "approved" | "posted" | "reversed" | "error";
  createdAt: string;
  invoice?: { number: string };
  outlet?: { name: string };
  glCode?: { code: string; description: string };
}
interface InvoiceVariance {
  id: string;
  invoiceId: string;
  varianceType:
    | "line_count"
    | "total_amount"
    | "tax_calculation"
    | "sku_mismatch"
    | "quantity_variance"
    | "price_variance"
    | "duplicate"
    | "missing_item";
  severity: "low" | "medium" | "high" | "critical";
  expectedValue?: number;
  actualValue?: number;
  varianceAmount?: number;
  variancePercentage?: number;
  description: string;
  requiresManualReview: boolean;
  reviewedAt?: string;
  createdAt: string;
  invoice?: { number: string; vendor?: { name: string } };
}
interface ApprovalWorkflow {
  id: string;
  invoiceId: string;
  workflowType:
    | "standard"
    | "high_value"
    | "variance_detected"
    | "variance_critical";
  totalAmount?: number;
  status: "pending" | "in_review" | "approved" | "rejected" | "escalated";
  requiredApprovers: number;
  approvalsReceived: number;
  submittedAt: string;
  approvedAt?: string;
  invoice?: { number: string; vendor?: { name: string } };
}
interface GLPostingQueueItem {
  id: string;
  invoiceId: string;
  allocationId: string;
  postPeriod: string;
  status: "pending" | "queued" | "processing" | "posted" | "failed";
  postingAttempt: number;
  scheduledPostDate?: string;
  actualPostDate?: string;
  createdAt: string;
  invoice?: { number: string };
}
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
} // ============================================================================
// EXTRACTION RESULTS HOOK
// ============================================================================ export function useExtractionResults(limit = 50) { const [results, setResults] = useState<ExtractionResult[]>([]); const [pagination, setPagination] = useState({ total: 0, limit, offset: 0, hasMore: false, }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user } = useAuth(); const fetchResults = useCallback( async (offset = 0, invoiceId?: string) => { if (!user) return; try { setLoading(true); const params = new URLSearchParams({ limit: String(limit), offset: String(offset), }); if (invoiceId) params.append("invoiceId", invoiceId); const response = await fetch( `/api/invoice-gl-integration/extractions?${params}`, { headers: {"x-user-id": user.id, }, } ); if (!response.ok) throw new Error("Failed to fetch extraction results"); const { data, pagination: pag } = (await response.json()) as PaginatedResponse<ExtractionResult>; setResults(data); setPagination(pag); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [limit, user] ); const createExtraction = useCallback( async (extractionData: Partial<ExtractionResult>) => { if (!user) return null; try { const response = await fetch("/api/invoice-gl-integration/extractions", { method:"POST", headers: {"Content-Type":"application/json","x-user-id": user.id, }, body: JSON.stringify(extractionData), }); if (!response.ok) throw new Error("Failed to create extraction"); const result = await response.json(); fetchResults(); return result; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchResults] ); useEffect(() => { fetchResults(); }, [fetchResults]); return { results, pagination, loading, error, createExtraction, refetch: fetchResults, }; }
// ============================================================================
// GL ALLOCATIONS HOOK
// ============================================================================ export function useGLAllocations(limit = 50) { const [allocations, setAllocations] = useState<GLAllocation[]>([]); const [pagination, setPagination] = useState({ total: 0, limit, offset: 0, hasMore: false, }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user, organization } = useAuth(); const fetchAllocations = useCallback( async (offset = 0, invoiceId?: string, status?: string) => { if (!user || !organization) return; try { setLoading(true); const params = new URLSearchParams({ limit: String(limit), offset: String(offset), }); if (invoiceId) params.append("invoiceId", invoiceId); if (status) params.append("status", status); const response = await fetch( `/api/invoice-gl-integration/allocations?${params}`, { headers: {"x-user-id": user.id,"x-org-id": organization.id, }, } ); if (!response.ok) throw new Error("Failed to fetch allocations"); const { data, pagination: pag } = (await response.json()) as PaginatedResponse<GLAllocation>; setAllocations(data); setPagination(pag); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [limit, user, organization] ); const createAllocation = useCallback( async (allocationData: Partial<GLAllocation>) => { if (!user || !organization) return null; try { const response = await fetch("/api/invoice-gl-integration/allocations", { method:"POST", headers: {"Content-Type":"application/json","x-user-id": user.id,"x-org-id": organization.id, }, body: JSON.stringify({ ...allocationData, organizationId: organization.id, }), }); if (!response.ok) throw new Error("Failed to create allocation"); const result = await response.json(); fetchAllocations(); return result; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, organization, fetchAllocations] ); useEffect(() => { fetchAllocations(); }, [fetchAllocations]); return { allocations, pagination, loading, error, createAllocation, refetch: fetchAllocations, }; }
// ============================================================================
// INVOICE VARIANCES HOOK
// ============================================================================ export function useInvoiceVariances(limit = 50) { const [variances, setVariances] = useState<InvoiceVariance[]>([]); const [pagination, setPagination] = useState({ total: 0, limit, offset: 0, hasMore: false, }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user } = useAuth(); const fetchVariances = useCallback( async (offset = 0, invoiceId?: string, severity?: string) => { if (!user) return; try { setLoading(true); const params = new URLSearchParams({ limit: String(limit), offset: String(offset), reviewed:"false", }); if (invoiceId) params.append("invoiceId", invoiceId); if (severity) params.append("severity", severity); const response = await fetch( `/api/invoice-gl-integration/variances?${params}`, { headers: {"x-user-id": user.id, }, } ); if (!response.ok) throw new Error("Failed to fetch variances"); const { data, pagination: pag } = (await response.json()) as PaginatedResponse<InvoiceVariance>; setVariances(data); setPagination(pag); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [limit, user] ); const reviewVariance = useCallback( async (varianceId: string, notes?: string) => { if (!user) return null; try { const response = await fetch( `/api/invoice-gl-integration/variances/${varianceId}/review`, { method:"PATCH", headers: {"Content-Type":"application/json","x-user-id": user.id, }, body: JSON.stringify({ notes }), } ); if (!response.ok) throw new Error("Failed to review variance"); const result = await response.json(); fetchVariances(); return result; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchVariances] ); useEffect(() => { fetchVariances(); }, [fetchVariances]); return { variances, pagination, loading, error, reviewVariance, refetch: fetchVariances, }; }
// ============================================================================
// APPROVAL WORKFLOWS HOOK
// ============================================================================ export function useApprovalWorkflows(limit = 50) { const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]); const [pagination, setPagination] = useState({ total: 0, limit, offset: 0, hasMore: false, }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user, organization } = useAuth(); const fetchWorkflows = useCallback( async (offset = 0, status?: string) => { if (!user || !organization) return; try { setLoading(true); const params = new URLSearchParams({ limit: String(limit), offset: String(offset), }); if (status) params.append("status", status); const response = await fetch( `/api/invoice-gl-integration/workflows?${params}`, { headers: {"x-user-id": user.id,"x-org-id": organization.id, }, } ); if (!response.ok) throw new Error("Failed to fetch workflows"); const { data, pagination: pag } = (await response.json()) as PaginatedResponse<ApprovalWorkflow>; setWorkflows(data); setPagination(pag); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [limit, user, organization] ); const approveWorkflow = useCallback( async (workflowId: string, notes?: string) => { if (!user) return null; try { const response = await fetch( `/api/invoice-gl-integration/workflows/${workflowId}/approve`, { method:"PATCH", headers: {"Content-Type":"application/json","x-user-id": user.id, }, body: JSON.stringify({ notes }), } ); if (!response.ok) throw new Error("Failed to approve workflow"); const result = await response.json(); fetchWorkflows(); return result; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchWorkflows] ); const rejectWorkflow = useCallback( async (workflowId: string, notes?: string) => { if (!user) return null; try { const response = await fetch( `/api/invoice-gl-integration/workflows/${workflowId}/reject`, { method:"PATCH", headers: {"Content-Type":"application/json","x-user-id": user.id, }, body: JSON.stringify({ notes }), } ); if (!response.ok) throw new Error("Failed to reject workflow"); const result = await response.json(); fetchWorkflows(); return result; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchWorkflows] ); useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]); return { workflows, pagination, loading, error, approveWorkflow, rejectWorkflow, refetch: fetchWorkflows, }; }
// ============================================================================
// GL POSTING QUEUE HOOK
// ============================================================================ export function useGLPostingQueue(limit = 50) { const [queueItems, setQueueItems] = useState<GLPostingQueueItem[]>([]); const [pagination, setPagination] = useState({ total: 0, limit, offset: 0, hasMore: false, }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const { user, organization } = useAuth(); const fetchQueue = useCallback( async (offset = 0, status?: string) => { if (!user || !organization) return; try { setLoading(true); const params = new URLSearchParams({ limit: String(limit), offset: String(offset), }); if (status) params.append("status", status); const response = await fetch( `/api/invoice-gl-integration/posting-queue?${params}`, { headers: {"x-user-id": user.id,"x-org-id": organization.id, }, } ); if (!response.ok) throw new Error("Failed to fetch posting queue"); const { data, pagination: pag } = (await response.json()) as PaginatedResponse<GLPostingQueueItem>; setQueueItems(data); setPagination(pag); setError(null); } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); } finally { setLoading(false); } }, [limit, user, organization] ); const postItem = useCallback( async (queueItemId: string) => { if (!user) return null; try { const response = await fetch( `/api/invoice-gl-integration/posting-queue/${queueItemId}/post`, { method:"PATCH", headers: {"x-user-id": user.id, }, } ); if (!response.ok) throw new Error("Failed to post GL entry"); const result = await response.json(); fetchQueue(); return result; } catch (err) { setError(err instanceof Error ? err.message :"Unknown error"); return null; } }, [user, fetchQueue] ); useEffect(() => { fetchQueue(); }, [fetchQueue]); return { queueItems, pagination, loading, error, postItem, refetch: fetchQueue, }; }
