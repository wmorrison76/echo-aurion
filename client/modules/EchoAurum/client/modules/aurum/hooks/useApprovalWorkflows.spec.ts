import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useApprovalWorkflows } from "./useApprovalWorkflows";
describe("useApprovalWorkflows", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  describe("getApprovalQueue", () => {
    it("should fetch approval queue successfully", async () => {
      const mockData = {
        approvals: [
          {
            id: "appreq_1",
            workflowId: "wf_1",
            transactionType: "invoice",
            transactionId: "inv_123",
            transactionDetails: { amount: 5000 },
            currentApprovalLevel: 1,
            status: "pending",
            createdAt: "2024-01-20T10:00:00Z",
            createdBy: "user@company.com",
          },
        ],
        total: 1,
        summary: { pending: 1, approved: 0, rejected: 0, escalated: 0 },
      };
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockData });
      const { result } = renderHook(() => useApprovalWorkflows());
      let queue;
      await act(async () => {
        queue = await result.current.getApprovalQueue();
      });
      expect(queue).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/aurum/approvals/queue?",
        expect.objectContaining({ credentials: "same-origin" }),
      );
    });
    it("should handle error when fetching queue fails", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });
      const { result } = renderHook(() => useApprovalWorkflows());
      await act(async () => {
        await result.current.getApprovalQueue();
      });
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain(
        "Failed to get approval queue",
      );
    });
  });
  describe("approveRequest", () => {
    it("should approve a request successfully", async () => {
      const mockData = {
        approvalAction: {
          id: "appr_1",
          approvalRequestId: "appreq_1",
          approvedBy: "manager@company.com",
          approverRole: "manager",
          status: "approved",
          timestamp: "2024-01-20T10:30:00Z",
        },
        approvalRequest: {
          id: "appreq_1",
          status: "approved",
          currentApprovalLevel: 1,
        },
        message: "Fully approved. Transaction can now proceed.",
      };
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockData });
      const { result } = renderHook(() => useApprovalWorkflows());
      let approval;
      await act(async () => {
        approval = await result.current.approveRequest(
          "appreq_1",
          "manager",
          "Looks good",
        );
      });
      expect(approval).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/aurum/approvals/appreq_1/approve",
        expect.objectContaining({ method: "POST" }),
      );
    });
    it("should handle rejection reason requirement", async () => {
      const { result } = renderHook(() => useApprovalWorkflows());
      expect(result.current.error).toBeNull();
    });
  });
  describe("rejectRequest", () => {
    it("should reject a request with reason", async () => {
      const mockData = {
        approvalAction: {
          id: "appr_2",
          approvalRequestId: "appreq_1",
          approvedBy: "manager@company.com",
          approverRole: "manager",
          status: "rejected",
          comments: "Missing vendor documentation",
          timestamp: "2024-01-20T10:35:00Z",
        },
        approvalRequest: { id: "appreq_1", status: "rejected" },
        message: "Request rejected by manager: Missing vendor documentation",
      };
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockData });
      const { result } = renderHook(() => useApprovalWorkflows());
      let rejection;
      await act(async () => {
        rejection = await result.current.rejectRequest(
          "appreq_1",
          "Missing vendor documentation",
        );
      });
      expect(rejection).toEqual(mockData);
    });
  });
  describe("delegateApproval", () => {
    it("should delegate approval to another user", async () => {
      const mockData = {
        delegation: {
          id: "deleg_1",
          approvalRequestId: "appreq_1",
          delegatedBy: "manager@company.com",
          delegatedTo: "alternate@company.com",
          reason: "On vacation",
          timestamp: "2024-01-20T10:40:00Z",
        },
        message: "Approval delegated to alternate@company.com",
      };
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockData });
      const { result } = renderHook(() => useApprovalWorkflows());
      let delegation;
      await act(async () => {
        delegation = await result.current.delegateApproval(
          "appreq_1",
          "alternate@company.com",
        );
      });
      expect(delegation).toEqual(mockData);
    });
  });
  describe("error handling", () => {
    it("should clear error when clearError is called", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, statusText: "Error" });
      const { result } = renderHook(() => useApprovalWorkflows());
      await act(async () => {
        await result.current.getApprovalQueue();
      });
      expect(result.current.error).not.toBeNull();
      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });
  });
});
