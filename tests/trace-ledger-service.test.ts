/**
 * TraceLedger Service Validation Tests
 * Validates claims in TRACELEDGER_ENTERPRISE_SPEC.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TraceLedgerService } from "../server/services/trace-ledger-service";
import type { TraceLedgerAppendInput } from "../shared/types/trace-ledger";

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
};

vi.mock("../server/lib/supabase-service-client", () => ({
  getSupabaseServiceClient: () => mockSupabase,
}));

describe("TraceLedgerService - Enterprise Spec Validation", () => {
  let service: TraceLedgerService;

  beforeEach(() => {
    service = new TraceLedgerService();
    vi.clearAllMocks();
  });

  describe("append() - Schema Validation", () => {
    it("should validate required fields: orgId, entityType, entityId, payload", async () => {
      const validInput: TraceLedgerAppendInput = {
        orgId: "org-123",
        entityType: "invoice",
        entityId: "inv-001",
        payload: { action: "created" },
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "uuid-123",
          org_id: validInput.orgId,
          entity_type: validInput.entityType,
          entity_id: validInput.entityId,
          source_ref: null,
          payload: validInput.payload,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await service.append(validInput);

      expect(result.orgId).toBe(validInput.orgId);
      expect(result.entityType).toBe(validInput.entityType);
      expect(result.entityId).toBe(validInput.entityId);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: validInput.orgId,
          entity_type: validInput.entityType,
          entity_id: validInput.entityId,
        }),
      );
    });

    it("should reject missing orgId", async () => {
      const invalidInput = {
        entityType: "invoice",
        entityId: "inv-001",
        payload: {},
      } as any;

      await expect(service.append(invalidInput)).rejects.toThrow();
    });

    it("should reject empty entityType", async () => {
      const invalidInput: TraceLedgerAppendInput = {
        orgId: "org-123",
        entityType: "",
        entityId: "inv-001",
        payload: {},
      };

      await expect(service.append(invalidInput)).rejects.toThrow();
    });

    it("should accept optional sourceRef", async () => {
      const input: TraceLedgerAppendInput = {
        orgId: "org-123",
        entityType: "invoice",
        entityId: "inv-001",
        sourceRef: "req-456",
        payload: {},
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: "uuid-123",
          org_id: input.orgId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          source_ref: input.sourceRef,
          payload: input.payload,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await service.append(input);
      expect(result.sourceRef).toBe(input.sourceRef);
    });
  });

  describe("listByEntity() - Org Isolation", () => {
    it("should enforce org_id filter in queries", async () => {
      const orgId = "org-123";
      const entityType = "invoice";
      const entityId = "inv-001";

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await service.listByEntity(orgId, entityType, entityId);

      expect(mockSupabase.eq).toHaveBeenCalledWith("org_id", orgId);
      expect(mockSupabase.eq).toHaveBeenCalledWith("entity_type", entityType);
      expect(mockSupabase.eq).toHaveBeenCalledWith("entity_id", entityId);
    });

    it("should order by created_at descending", async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await service.listByEntity("org-123", "invoice", "inv-001");

      expect(mockSupabase.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("should default limit to 100", async () => {
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      await service.listByEntity("org-123", "invoice", "inv-001");

      expect(mockSupabase.limit).toHaveBeenCalledWith(100);
    });
  });

  describe("listBySourceRef() - Org Isolation", () => {
    it("should enforce org_id filter in source ref queries", async () => {
      const orgId = "org-123";
      const sourceRef = "req-456";

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await service.listBySourceRef(orgId, sourceRef);

      expect(mockSupabase.eq).toHaveBeenCalledWith("org_id", orgId);
      expect(mockSupabase.eq).toHaveBeenCalledWith("source_ref", sourceRef);
    });
  });

  describe("Append-Only Guarantee", () => {
    it("should only expose insert operations (no update/delete methods)", () => {
      const serviceMethods = Object.getOwnPropertyNames(
        TraceLedgerService.prototype,
      ).filter((name) => name !== "constructor");

      expect(serviceMethods).toContain("append");
      expect(serviceMethods).toContain("listByEntity");
      expect(serviceMethods).toContain("listBySourceRef");

      // Verify no update/delete methods exist
      expect(serviceMethods).not.toContain("update");
      expect(serviceMethods).not.toContain("delete");
      expect(serviceMethods).not.toContain("remove");
    });
  });
});
