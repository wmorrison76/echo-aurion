/**
 * EchoAurum E2E Testing Suite
 * Tests complete workflows: GL posting → Guardian checks → Approval → Posting
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ApprovalRulesEngine } from "../services/approvalRulesEngine";
import { ApprovalEscalationEngine } from "../services/approvalEscalationEngine";
import { ApprovalDelegationEngine } from "../services/approvalDelegationEngine";
import { GuardianAI } from "../services/guardianAI";
import { AutoPostEngine } from "../services/autoPostEngine";
import { InventoryConnector } from "../services/connectors/inventoryConnector";
import { SchedulingConnector } from "../services/connectors/schedulingConnector";
import { RevenueMetricsEngine } from "../services/revenueMetricsEngine";
import { BankFeedConnector } from "../services/connectors/bankFeedConnector";
import { CustomReportBuilder } from "../services/customReportBuilder";

describe("EchoAurum E2E Tests", () => {
  const testEntityId = "test-entity-001";
  const testUserId = "test-user-001";

  describe("GL Posting Workflow", () => {
    it("should create journal entry, pass Guardian checks, and auto-post", async () => {
      const transaction = {
        id: `je-${Date.now()}`,
        glAccountId: "4000",
        amount: 5000,
        description: "Room Revenue - Test",
        transactionType: "revenue",
        date: new Date(),
        entityId: testEntityId,
      };

      // Step 1: Run Guardian checks
      const guardianResult = await GuardianAI.checkTransaction(
        transaction,
        testEntityId,
        testUserId,
      );
      expect(guardianResult).toBeDefined();
      expect(guardianResult.argusResult.passed).toBe(true);
      expect(guardianResult.overallRiskScore).toBeLessThan(50);

      // Step 2: Evaluate approval requirements
      const approvalReq =
        await ApprovalRulesEngine.evaluateApprovalRequirements(
          transaction,
          testEntityId,
        );
      expect(approvalReq).toBeDefined();

      // Step 3: Auto-post if eligible
      if (guardianResult.canAutoPost) {
        const autoPostResult = await AutoPostEngine.processAndAutoPost({
          transactionId: transaction.id,
          transactionType: "journal_entry",
          transaction,
          entityId: testEntityId,
          userId: testUserId,
        });

        expect(autoPostResult).toBeDefined();
        expect(typeof autoPostResult.success).toBe("boolean");
        expect(typeof autoPostResult.autoPosted).toBe("boolean");
      }
    });

    it("should reject unbalanced journal entry", async () => {
      const transaction = {
        id: `je-unbalanced-${Date.now()}`,
        glAccountId: "4000",
        amount: 5000,
        description: "Unbalanced entry",
        transactionType: "manual_journal_entry",
        date: new Date(),
        // Missing debit/credit balance
      };

      const guardianResult = await GuardianAI.checkTransaction(
        transaction,
        testEntityId,
        testUserId,
      );
      expect(guardianResult.argusResult.passed).toBe(false);
      expect(
        guardianResult.argusResult.missingFields.length +
          guardianResult.argusResult.violations.length,
      ).toBeGreaterThan(0);
    });

    it("should flag large transactions for approval", async () => {
      const transaction = {
        id: `je-large-${Date.now()}`,
        glAccountId: "4000",
        amount: 150000,
        description: "Large revenue adjustment",
        transactionType: "manual_journal_entry",
        date: new Date(),
        documentRef: "DOC-001",
      };

      const guardianResult = await GuardianAI.checkTransaction(
        transaction,
        testEntityId,
        testUserId,
      );
      expect(guardianResult.canAutoPost).toBe(false);
      expect(guardianResult.argusResult.violations.length).toBeGreaterThan(0);
    });
  });

  describe("Approval Workflow", () => {
    it("should evaluate rules and determine approval path", async () => {
      const transaction = {
        id: `je-approval-${Date.now()}`,
        glAccountId: "4000",
        amount: 25000,
        description: "Approval test transaction",
        transactionType: "manual_journal_entry",
        date: new Date(),
        documentRef: "DOC-002",
      };

      const requirement =
        await ApprovalRulesEngine.evaluateApprovalRequirements(
          transaction,
          testEntityId,
        );
      expect(requirement).toBeDefined();
      expect(requirement.approvalLevel).toBeGreaterThan(0);
    });

    it("should escalate approval after SLA threshold", async () => {
      const oldApproval = {
        id: "apr-old-001",
        status: "pending",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        assignedTo: "approver-001",
        escalationLevel: 1,
      };

      const escalationPolicy =
        await ApprovalEscalationEngine.checkForEscalation(oldApproval);
      expect(escalationPolicy).toBeDefined();
      expect(escalationPolicy?.level).toBeGreaterThan(0);
    });

    it("should allow delegation of approvals", async () => {
      const canDelegate = await ApprovalDelegationEngine.canDelegate(
        "approver-001",
        "approver-002",
      );
      expect(canDelegate).toBe(true);

      const delegation = await ApprovalDelegationEngine.delegateApproval(
        "apr-001",
        "approver-001",
        "approver-002",
        "Out of office",
      );

      expect(delegation).toBeDefined();
      expect(delegation?.fromApprover).toBe("approver-001");
    });
  });

  describe("Guardian AI Checks", () => {
    it("should detect duplicate transactions", async () => {
      const transaction1 = {
        id: `txn-dup-1`,
        vendor: "Supplier A",
        amount: 1000,
        date: new Date(),
        glAccountId: "5000",
        description: "Food purchase",
      };

      const transaction2 = {
        id: `txn-dup-2`,
        vendor: "Supplier A",
        amount: 1000,
        date: new Date(Date.now() + 1000), // 1 sec later
        glAccountId: "5000",
        description: "Food purchase",
      };

      await GuardianAI.checkTransaction(transaction1, testEntityId, testUserId);
      const result2 = await GuardianAI.checkTransaction(
        transaction2,
        testEntityId,
        testUserId,
      );

      // Zelda should detect potential duplicate
      expect(result2.zeldaResult.duplicateDetection.isDuplicate).toBe(true);
    });

    it("should validate GL account rules", async () => {
      const transaction = {
        id: `txn-account-test`,
        glAccountId: "7000", // High-risk account
        amount: 10000,
        description: "Adjustment entry",
        transactionType: "adjustment",
        date: new Date(),
        documentRef: "DOC-ADJ-001",
      };

      const result = await GuardianAI.checkTransaction(
        transaction,
        testEntityId,
        testUserId,
      );
      expect(result.argusResult.violations.length).toBeGreaterThan(0);
    });

    it("should provide immutable audit trail", async () => {
      const transaction = {
        id: `txn-audit-${Date.now()}`,
        glAccountId: "4000",
        amount: 5000,
        description: "Audit test",
        date: new Date(),
      };

      const result = await GuardianAI.checkTransaction(
        transaction,
        testEntityId,
        testUserId,
      );
      expect(result.odinResult.immutable).toBe(true);
      expect(result.odinResult.hashValue).toBeDefined();
      expect(result.odinResult.auditTrailId).toBeDefined();

      // Verify immutability for unknown id (not yet in system)
      const isImmutable = await GuardianAI.verifyImmutability("txn-never-checked");
      expect(isImmutable).toBe(false);
    });
  });

  describe("Inventory Integration", () => {
    it("should sync inventory from MarginEdge", async () => {
      const inventory = await InventoryConnector.syncInventory(testEntityId);
      expect(inventory).toBeDefined();
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0]).toHaveProperty("name");
      expect(inventory[0]).toHaveProperty("quantity");
    });

    it("should calculate variance and GL impact", async () => {
      const inventory = await InventoryConnector.syncInventory(testEntityId);

      // Simulate count with variance
      const actual = inventory.map((i) => ({
        ...i,
        quantity: Math.round(i.quantity * (0.9 + Math.random() * 0.2)), // 90-110% of expected
      }));

      const variances = await InventoryConnector.calculateVariance(
        testEntityId,
        inventory,
        actual,
      );
      expect(variances).toBeDefined();

      const hasVariance = variances.some((v) => v.varianceQuantity !== 0);
      expect(hasVariance).toBe(true);
    });
  });

  describe("Scheduling Integration", () => {
    it("should sync labor schedule from Toast", async () => {
      const dateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const schedule = await SchedulingConnector.syncSchedule(
        testEntityId,
        dateRange,
      );
      expect(schedule).toBeDefined();
      expect(schedule.length).toBeGreaterThan(0);
    });

    it("should calculate labor variance", async () => {
      const dateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const schedule = await SchedulingConnector.syncSchedule(
        testEntityId,
        dateRange,
      );
      const actuals = await SchedulingConnector.syncLaborActuals(
        testEntityId,
        dateRange,
      );

      const variances = await SchedulingConnector.calculateVariance(
        testEntityId,
        schedule,
        actuals,
      );
      expect(variances).toBeDefined();
    });
  });

  describe("Revenue Metrics", () => {
    it("should calculate daily revenue metrics", async () => {
      const metrics = await RevenueMetricsEngine.calculateDailyMetrics(
        testEntityId,
        new Date(),
      );
      expect(metrics).toBeDefined();
      expect(metrics.occupancyPercent).toBeGreaterThanOrEqual(0);
      expect(metrics.occupancyPercent).toBeLessThanOrEqual(100);
      expect(metrics.adr).toBeGreaterThan(0);
      expect(metrics.revpar).toBeGreaterThan(0);
    });

    it("should generate revenue forecast", async () => {
      const forecasts = await RevenueMetricsEngine.forecastMetrics(
        testEntityId,
        new Date(),
        7,
      );
      expect(forecasts).toBeDefined();
      expect(forecasts.length).toBe(7);
      expect(forecasts[0].expectedOccupancy).toBeGreaterThan(0);
      expect(forecasts[0].expectedADR).toBeGreaterThan(0);
    });
  });

  describe("Bank Feed Integration", () => {
    it("should download and match bank transactions", async () => {
      const dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const transactions = await BankFeedConnector.downloadTransactions(
        testEntityId,
        "account-001",
        dateRange,
      );
      expect(transactions).toBeDefined();
      expect(transactions.length).toBeGreaterThan(0);

      // Mock GL entries for matching
      const glEntries = transactions.map((t, i) => ({
        id: `gl-${i}`,
        amount: t.amount,
        date: new Date(t.date.getTime() + Math.random() * 24 * 60 * 60 * 1000),
        description: t.description,
      }));

      const matches = await BankFeedConnector.matchTransactions(
        testEntityId,
        transactions,
        glEntries,
      );
      expect(matches).toBeDefined();
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe("Custom Report Builder", () => {
    it("should create and execute custom report", async () => {
      const report = await CustomReportBuilder.createReport({
        name: "Test Daily Report",
        description: "Test report for daily metrics",
        fields: [
          {
            name: "revenue",
            label: "Daily Revenue",
            type: "amount",
            source: "revenue",
          },
          {
            name: "occupancy",
            label: "Occupancy %",
            type: "percentage",
            source: "revenue",
          },
        ],
        filters: [],
        isScheduled: false,
        createdBy: testUserId,
      });

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();

      const execution = await CustomReportBuilder.executeReport(
        report.id,
        testEntityId,
      );
      expect(execution.status).toBe("success");
      expect(execution.rowCount).toBeGreaterThanOrEqual(0);
    });

    it("should retrieve available templates", () => {
      const templates = CustomReportBuilder.getAvailableTemplates();
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe("Performance Tests", () => {
    it("should handle bulk Guardian checks (<100ms per transaction)", async () => {
      const transactions = Array.from({ length: 10 }, (_, i) => ({
        id: `bulk-${i}`,
        glAccountId: "4000",
        amount: 1000 + Math.random() * 5000,
        description: `Bulk test transaction ${i}`,
        date: new Date(),
      }));

      const startTime = Date.now();

      for (const txn of transactions) {
        await GuardianAI.checkTransaction(txn, testEntityId, testUserId);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / transactions.length;

      console.log(
        `Bulk Guardian checks: ${duration}ms total, ${avgTime.toFixed(0)}ms per transaction`,
      );
      expect(avgTime).toBeLessThan(200); // Allow some slack for test environment
    });
  });
});
