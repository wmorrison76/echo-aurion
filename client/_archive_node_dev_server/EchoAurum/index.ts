import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleEchoAiRespond } from "./routes/echo-ai";
import { handleFlashReport } from "./routes/flash";
import { handleRollback } from "./routes/rollback";
import { handleCpaExport } from "./routes/cpa";
import { handleGuardrails } from "./routes/guards";
import { handleCashOptimizer } from "./routes/cash";
import { handleAutomationStream } from "./routes/automation";
import { handleForecast } from "./routes/forecast";
import { handleVarianceInsights } from "./routes/insights";
import {
  handleCheckSODViolation,
  handleGetSODRules,
  handleCreateSODRule,
  handleGetSODViolations,
  handleGetUserRoles,
  handleAssignRole,
  handleRevokeRole,
  handleInitializeSOD,
} from "./routes/compliance";
import { handleComplianceAutomation } from "./routes/complianceAutomation";
import { handleOnboardingPlaybook } from "./routes/onboarding";
import { handleMigrationToolkit } from "./routes/migration";
import { handleVarianceRadar } from "./routes/variance";
import { handleInvoiceWorkflow } from "./routes/apWorkflow";
import { handleConsoleOverview } from "./routes/console";
import { handleConsoleNotifications } from "./routes/consoleNotifications";
import { handlePurchasingDashboard } from "./routes/purchasing";
import {
  handleBinderCompose,
  handleChecklistValidation,
  handleCpaAccess,
  handleDocuSignBundle,
  handlePbcPortal,
} from "./routes/cpaBridge";
import { handleArgusAudit } from "./routes/argus";
import { handleLaborOptimizer } from "./routes/labor";
import { handlePortfolioRollup } from "./routes/portfolio";
import { handleSentinelAnalysis } from "./routes/sentinel";
import { handleAuthenticatedProfile } from "./routes/profile";
import { handleLedgerExplorer } from "./routes/ledgerExplorer";
import { handleOutletPnl } from "./routes/pnl";
import {
  createOutlet,
  listOutlets,
  getOutlet,
  updateOutlet,
  deleteOutlet,
  createBudgetLineItem,
  getBudgetForOutlet,
  getOutletPnLReport,
  getConsolidatedPnL,
  setPnLDrivers,
  getPnLDrivers,
  importLegacyPnL,
  analyzeLegacyPnL,
} from "./routes/outlets";
import {
  handleGLCatalog,
  handleGLExplorer,
  handleGLDrillDown,
} from "./routes/glExplorer";
import {
  handleBudgetPlan,
  handleBudgetAnalysis,
  handleBudgetDrivers,
  handleBudgetForecast,
  handleBudgetVarianceDetail,
} from "./routes/budgetPlanning";
import {
  createSession,
  destroySession,
  getActiveSession,
  listPersonas,
} from "./routes/auth";
import { requireSession } from "./middleware/session";
import { GUARDRAIL_IDS } from "./services/session";
import {
  handleCreateJournalEntry,
  handlePostJournalEntry,
  handleReverseJournalEntry,
  handleGetTrialBalance,
  handleGetGeneralLedger,
  handleCreateReconciliation,
  handleRunGuardianAudit,
} from "./routes/aurumGl";
import {
  handleGetAutomationSettings,
  handleSetAutomationSettings,
  handleGetAccountOverrides,
  handleSetAccountOverride,
  handleGetSchedules,
  handleSetSchedule,
  handleGetAutomationStatus,
} from "./routes/aurumAutomation";
import {
  handleCreateAPInvoice,
  handleListAPInvoices,
  handleGetAPInvoice,
  handleMatchAPInvoice,
  handleResolveAPVariance,
  handleSubmitAPForApproval,
  handleApproveAPInvoice,
  handleRejectAPInvoice,
  handleSubmitAPPayment,
  handleRecordAPPayment,
  handleListVendors,
  handleGetVendorSummary,
  handleGetAPGuardianChecks,
  handleGetAPSummary,
  handleGetAPAgingReport,
} from "./routes/aurumAP";
import {
  handleTrialBalance,
  handleBalanceSheet,
  handleIncomeStatement,
  handleCashFlowStatement,
  handleAccountDrillDown,
  handleVarianceAnalysis,
} from "./routes/aurumReports";
import { createAurumReportsRouter } from "./routes/aurumReports";
import { createAurumPnLRouter } from "./routes/aurumPnL";
import { createAurumPnLExportRouter } from "./routes/aurumPnLExport";
import { createAurumConsolidationRouter } from "./routes/aurumConsolidation";
import { createAurumFXTranslationRouter } from "./routes/aurumFXTranslation";
import {
  handleCaptureInvoice,
  handleMatchInvoice,
  handleSubmitInvoiceForApproval,
  handleApproveInvoiceForPayment,
  handleInitiatePayment,
  handleRecordPayment,
  handleProcessPaymentBatch,
  handleGetPaymentStatus,
} from "./routes/aurumPayments";
import {
  handleUploadBankStatement,
  handleMatchBankTransaction,
  handleAutoReconcile,
  handleInvestigateVariance,
  handleResolveReconciliation,
  handleGetReconciliationDetail,
  handleListReconciliations,
} from "./routes/aurumReconciliation";
import { createAutomationRulesRouter } from "./routes/automationRules";
import seedRuleTemplates from "./services/ruleTemplatesSeeder";
import {
  handleCreateApprovalWorkflow,
  handleSubmitForApproval,
  handleApproveRequest,
  handleRejectRequest,
  handleDelegateApproval,
  handleGetApprovalQueue,
  handleGetApprovalDetail,
} from "./routes/aurumApprovalWorkflows";
import {
  handleStripeOAuth,
  handleStripeConfig,
  handleStripeStatusEndpoint,
  handleSyncStripe,
  handleReconcileStripe,
  handleGetStripeTransactions,
  handleStripeWebhook,
  handleSlackOAuth,
  handleSlackConfig,
  handleSlackStatusEndpoint,
  handleSlackTest,
  handleGustoOAuth,
  handleGustoConfig,
  handleGustoStatusEndpoint,
  handleSyncGusto,
  handleToastConfig,
  handleToastStatusEndpoint,
  handleSyncToastRevenueEndpoint,
  handleSyncToastCogsEndpoint,
  handleDetectDiscrepancies,
  handleGetDiscrepancies,
} from "./routes/aurumIntegrations";
import {
  AurumDatabaseService,
  initializeAurumDatabase,
  createDatabasePoolAdapter,
} from "./services/aurumDatabase";
import { GuardianOversightSystem } from "./services/aurumGuardians";
export async function createServer() {
  const app = express(); // Middleware app.use(cors()); app.use(express.json()); app.use(express.urlencoded({ extended: true })); // Initialize EchoAurum database and services (if DATABASE_URL is set) try { if (process.env.DATABASE_URL) { let neonPool: any; try { const { neon } = await import("@neondatabase/serverless"); neonPool = neon(process.env.DATABASE_URL); } catch { console.warn("⚠ @neondatabase/serverless not available. Install it with: npm install @neondatabase/serverless", ); throw new Error("Neon client not available"); } const pool = createDatabasePoolAdapter(neonPool); await initializeAurumDatabase(pool); const aurumDb = new AurumDatabaseService(pool); const guardianSystem = new GuardianOversightSystem(); app.set("aurumDb", aurumDb); app.set("guardianSystem", guardianSystem); // Seed rule templates try { await seedRuleTemplates(aurumDb); } catch (error) { console.warn("⚠ Failed to seed rule templates:", error instanceof Error ? error.message :"Unknown error", ); } console.log("✓ EchoAurum services initialized with Neon database"); } else { console.warn("⚠ DATABASE_URL not set. EchoAurum features require Neon. Set DATABASE_URL environment variable.", ); } } catch (error) { console.warn("⚠ EchoAurum database initialization failed:", error instanceof Error ? error.message :"Unknown error", ); } // Example API routes app.get("/api/ping", (_req, res) => { const ping = process.env.PING_MESSAGE ??"ping"; res.json({ message: ping }); }); app.get("/api/demo", handleDemo); app.post("/api/echo-ai/respond", handleEchoAiRespond); app.get("/api/auth/personas", listPersonas); app.get("/api/auth/session", getActiveSession); app.post("/api/auth/session", createSession); app.delete("/api/auth/session", destroySession); app.post("/api/flash-report", requireSession({ role:"auditor" }), handleFlashReport, ); app.post("/api/phoenix/rollback", requireSession({ role:"admin" }), handleRollback, ); app.post("/api/cpa/export", requireSession({ role:"auditor", guardrails: [GUARDRAIL_IDS.COMPLIANCE_EVIDENCE], }), handleCpaExport, ); app.post("/api/guards/evaluate", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.SENTINEL_RISK], }), handleGuardrails, ); app.post("/api/automation/stream", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.AUTOMATION_PIPELINE], }), handleAutomationStream, ); app.post("/api/console/overview", requireSession({ role:"viewer" }), handleConsoleOverview, ); app.post("/api/console/notifications", requireSession({ role:"viewer" }), handleConsoleNotifications, ); app.post("/api/ap/workflow", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.AP_RELEASE], }), handleInvoiceWorkflow, ); app.post("/api/purchasing/dashboard", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.AP_RELEASE], }), handlePurchasingDashboard, ); app.post("/api/cash/optimize", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.CASH_LIQUIDITY], }), handleCashOptimizer, ); app.post("/api/forecast/ai3", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.SENTINEL_RISK], }), handleForecast, ); app.post("/api/insights/variance", requireSession({ role:"auditor" }), handleVarianceInsights, ); app.post("/api/compliance/automation", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.COMPLIANCE_EVIDENCE], }), handleComplianceAutomation, ); // SOD (Segregation of Duties) Enforcement Routes app.post("/api/compliance/sod/check", requireSession({ role:"admin" }), handleCheckSODViolation, ); app.get("/api/compliance/sod/rules", requireSession({ role:"admin" }), handleGetSODRules, ); app.post("/api/compliance/sod/rules", requireSession({ role:"admin" }), handleCreateSODRule, ); app.get("/api/compliance/sod/violations", requireSession({ role:"auditor" }), handleGetSODViolations, ); app.get("/api/compliance/sod/user-roles", requireSession({ role:"admin" }), handleGetUserRoles, ); app.post("/api/compliance/sod/assign-role", requireSession({ role:"admin" }), handleAssignRole, ); app.post("/api/compliance/sod/revoke-role", requireSession({ role:"admin" }), handleRevokeRole, ); app.post("/api/compliance/initialize-sod", requireSession({ role:"admin" }), handleInitializeSOD, ); app.post("/api/onboarding/playbook", requireSession({ role:"auditor" }), handleOnboardingPlaybook, ); app.post("/api/migration/toolkit", requireSession({ role:"auditor" }), handleMigrationToolkit, ); app.post("/api/variance/radar", requireSession({ role:"auditor" }), handleVarianceRadar, ); app.post("/api/argus/audit", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.SENTINEL_RISK], }), handleArgusAudit, ); app.post("/api/cash/labor", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.CASH_LIQUIDITY], }), handleLaborOptimizer, ); app.post("/api/cash/portfolio", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.CASH_LIQUIDITY], }), handlePortfolioRollup, ); app.post("/api/sentinel/analyze", requireSession({ role:"auditor", guardrails: [GUARDRAIL_IDS.SENTINEL_RISK], }), handleSentinelAnalysis, ); app.post("/api/cpa/access", requireSession({ role:"auditor", guardrails: [GUARDRAIL_IDS.COMPLIANCE_EVIDENCE], }), handleCpaAccess, ); app.post("/api/cpa/binder", requireSession({ role:"auditor", guardrails: [GUARDRAIL_IDS.COMPLIANCE_EVIDENCE], }), handleBinderCompose, ); app.post("/api/cpa/pbc", requireSession({ role:"auditor", guardrails: [GUARDRAIL_IDS.COMPLIANCE_EVIDENCE], }), handlePbcPortal, ); app.post("/api/cpa/checklist", requireSession({ role:"auditor", guardrails: [GUARDRAIL_IDS.COMPLIANCE_EVIDENCE], }), handleChecklistValidation, ); app.post("/api/cpa/docusign", requireSession({ role:"auditor", guardrails: [GUARDRAIL_IDS.COMPLIANCE_EVIDENCE], }), handleDocuSignBundle, ); app.post("/api/profile/authenticated", requireSession({ role:"viewer" }), handleAuthenticatedProfile, ); app.post("/api/ledger/explorer", requireSession({ role:"auditor" }), handleLedgerExplorer, ); app.post("/api/pnl/outlet", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.CASH_LIQUIDITY], }), handleOutletPnl, ); app.get("/api/gl/catalog", requireSession({ role:"controller" }), handleGLCatalog, ); app.post("/api/gl/explorer", requireSession({ role:"controller" }), handleGLExplorer, ); app.post("/api/gl/drilldown", requireSession({ role:"controller" }), handleGLDrillDown, ); app.post("/api/budget/plan", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.CASH_LIQUIDITY], }), handleBudgetPlan, ); app.post("/api/budget/analysis", requireSession({ role:"controller", guardrails: [GUARDRAIL_IDS.CASH_LIQUIDITY], }), handleBudgetAnalysis, ); app.get("/api/budget/drivers", requireSession({ role:"controller" }), handleBudgetDrivers, ); app.post("/api/budget/forecast", requireSession({ role:"controller" }), handleBudgetForecast, ); app.post("/api/budget/variance", requireSession({ role:"controller" }), handleBudgetVarianceDetail, ); // ============================================================================ // Multi-Outlet P&L Management Routes // ============================================================================ app.post("/api/outlets", requireSession({ role:"admin" }), createOutlet); app.get("/api/outlets", requireSession({ role:"viewer" }), listOutlets); app.get("/api/outlets/:id", requireSession({ role:"viewer" }), getOutlet); app.put("/api/outlets/:id", requireSession({ role:"admin" }), updateOutlet); app.delete("/api/outlets/:id", requireSession({ role:"admin" }), deleteOutlet, ); app.post("/api/outlets/:outletId/budget-line-items", requireSession({ role:"controller" }), createBudgetLineItem, ); app.get("/api/outlets/:outletId/budget", requireSession({ role:"viewer" }), getBudgetForOutlet, ); app.get("/api/outlets/:outletId/pnl-report", requireSession({ role:"auditor" }), getOutletPnLReport, ); app.get("/api/outlets/consolidated/pnl", requireSession({ role:"auditor" }), getConsolidatedPnL, ); app.post("/api/outlets/:outletId/drivers", requireSession({ role:"controller" }), setPnLDrivers, ); app.get("/api/outlets/:outletId/drivers", requireSession({ role:"controller" }), getPnLDrivers, ); app.post("/api/outlets/import/legacy-pnl", requireSession({ role:"admin" }), importLegacyPnL, ); app.post("/api/outlets/import/:importId/analyze", requireSession({ role:"admin" }), analyzeLegacyPnL, ); // ============================================================================ // EchoAurum GL Routes // ============================================================================ app.post("/api/aurum/journal-entries", requireSession({ role:"controller" }), handleCreateJournalEntry, ); app.post("/api/aurum/journal-entries/:id/post", requireSession({ role:"controller" }), handlePostJournalEntry, ); app.post("/api/aurum/journal-entries/:id/reverse", requireSession({ role:"admin" }), handleReverseJournalEntry, ); app.get("/api/aurum/trial-balance", requireSession({ role:"auditor" }), handleGetTrialBalance, ); app.get("/api/aurum/general-ledger/:accountCode", requireSession({ role:"auditor" }), handleGetGeneralLedger, ); app.post("/api/aurum/reconciliations", requireSession({ role:"controller" }), handleCreateReconciliation, ); app.post("/api/aurum/guardian/audit", requireSession({ role:"auditor" }), handleRunGuardianAudit, ); // ============================================================================ // EchoAurum Automation Settings Routes // ============================================================================ app.get("/api/aurum/automation/settings", requireSession({ role:"controller" }), handleGetAutomationSettings, ); app.post("/api/aurum/automation/settings", requireSession({ role:"admin" }), handleSetAutomationSettings, ); app.get("/api/aurum/automation/overrides/:glAccountId", requireSession({ role:"controller" }), handleGetAccountOverrides, ); app.post("/api/aurum/automation/overrides/:glAccountId", requireSession({ role:"admin" }), handleSetAccountOverride, ); app.get("/api/aurum/automation/schedules/:featureName", requireSession({ role:"controller" }), handleGetSchedules, ); app.post("/api/aurum/automation/schedules", requireSession({ role:"admin" }), handleSetSchedule, ); app.get("/api/aurum/automation/status", requireSession({ role:"controller" }), handleGetAutomationStatus, ); // ============================================================================ // EchoAurum Automation Rules Routes (Week 10+) // ============================================================================ const aurumDbForRoutes = app.get("aurumDb") as | AurumDatabaseService | undefined; if (aurumDbForRoutes) { app.use("/api/aurum", createAutomationRulesRouter(aurumDbForRoutes)); } // ============================================================================ // EchoAurum AP/Invoice Routes // ============================================================================ app.post("/api/aurum/ap/invoices", requireSession({ role:"controller" }), handleCreateAPInvoice, ); app.get("/api/aurum/ap/invoices", requireSession({ role:"controller" }), handleListAPInvoices, ); app.get("/api/aurum/ap/invoices/:id", requireSession({ role:"controller" }), handleGetAPInvoice, ); app.post("/api/aurum/ap/invoices/:id/match", requireSession({ role:"controller" }), handleMatchAPInvoice, ); app.post("/api/aurum/ap/invoices/:id/resolve-variance", requireSession({ role:"controller" }), handleResolveAPVariance, ); app.post("/api/aurum/ap/invoices/:id/submit-approval", requireSession({ role:"controller" }), handleSubmitAPForApproval, ); app.post("/api/aurum/ap/invoices/:id/approve", requireSession({ role:"controller" }), handleApproveAPInvoice, ); app.post("/api/aurum/ap/invoices/:id/reject", requireSession({ role:"controller" }), handleRejectAPInvoice, ); app.post("/api/aurum/ap/payments", requireSession({ role:"controller" }), handleSubmitAPPayment, ); app.post("/api/aurum/ap/invoices/:id/record-payment", requireSession({ role:"controller" }), handleRecordAPPayment, ); app.get("/api/aurum/ap/vendors", requireSession({ role:"controller" }), handleListVendors, ); app.get("/api/aurum/ap/vendors/:vendorId", requireSession({ role:"controller" }), handleGetVendorSummary, ); app.get("/api/aurum/ap/invoices/:id/guardian-checks", requireSession({ role:"auditor" }), handleGetAPGuardianChecks, ); app.get("/api/aurum/ap/summary", requireSession({ role:"controller" }), handleGetAPSummary, ); app.get("/api/aurum/ap/aging-report", requireSession({ role:"auditor" }), handleGetAPAgingReport, ); // ============================================================================ // FINANCIAL REPORTS ROUTES // ============================================================================ app.get("/api/aurum/reports/trial-balance", requireSession({ role:"auditor" }), handleTrialBalance, ); app.get("/api/aurum/reports/balance-sheet", requireSession({ role:"auditor" }), handleBalanceSheet, ); app.get("/api/aurum/reports/income-statement", requireSession({ role:"auditor" }), handleIncomeStatement, ); app.get("/api/aurum/reports/cash-flow", requireSession({ role:"auditor" }), handleCashFlowStatement, ); app.get("/api/aurum/reports/account-detail", requireSession({ role:"controller" }), handleAccountDrillDown, ); app.get("/api/aurum/reports/variance-analysis", requireSession({ role:"auditor" }), handleVarianceAnalysis, ); // Register the new P&L and financial reports router if (app.get("aurumDb")) { const aurumDb = app.get("aurumDb") as AurumDatabaseService; const reportsRouter = createAurumReportsRouter(aurumDb); app.use("/api/aurum/reports", reportsRouter); const pnlRouter = createAurumPnLRouter(aurumDb); app.use("/api/aurum/pnl", pnlRouter); const pnlExportRouter = createAurumPnLExportRouter(aurumDb); app.use("/api/aurum/pnl/export", pnlExportRouter); const consolidationRouter = createAurumConsolidationRouter(aurumDb); app.use("/api/aurum/consolidation", consolidationRouter); const fxRouter = createAurumFXTranslationRouter(aurumDb); app.use("/api/aurum/fx", fxRouter); } // ============================================================================ // PAYMENT PROCESSING ROUTES // ============================================================================ app.post("/api/aurum/payments/capture", requireSession({ role:"controller" }), handleCaptureInvoice, ); app.post("/api/aurum/payments/match", requireSession({ role:"controller" }), handleMatchInvoice, ); app.post("/api/aurum/payments/submit-approval", requireSession({ role:"controller" }), handleSubmitInvoiceForApproval, ); app.post("/api/aurum/payments/approve", requireSession({ role:"auditor" }), handleApproveInvoiceForPayment, ); app.post("/api/aurum/payments/initiate", requireSession({ role:"controller" }), handleInitiatePayment, ); app.post("/api/aurum/payments/record", requireSession({ role:"auditor" }), handleRecordPayment, ); app.post("/api/aurum/payments/batch", requireSession({ role:"auditor" }), handleProcessPaymentBatch, ); app.get("/api/aurum/payments/status", requireSession({ role:"controller" }), handleGetPaymentStatus, ); // ============================================================================ // RECONCILIATION ROUTES // ============================================================================ app.post("/api/aurum/reconciliation/upload-statement", requireSession({ role:"controller" }), handleUploadBankStatement, ); app.post("/api/aurum/reconciliation/match", requireSession({ role:"controller" }), handleMatchBankTransaction, ); app.post("/api/aurum/reconciliation/auto-reconcile", requireSession({ role:"controller" }), handleAutoReconcile, ); app.post("/api/aurum/reconciliation/investigate", requireSession({ role:"auditor" }), handleInvestigateVariance, ); app.post("/api/aurum/reconciliation/resolve", requireSession({ role:"auditor" }), handleResolveReconciliation, ); app.get("/api/aurum/reconciliation/:id", requireSession({ role:"controller" }), handleGetReconciliationDetail, ); app.get("/api/aurum/reconciliation", requireSession({ role:"controller" }), handleListReconciliations, ); // ============================================================================ // APPROVAL WORKFLOW ROUTES // ============================================================================ app.post("/api/aurum/approvals/workflow", requireSession({ role:"auditor" }), handleCreateApprovalWorkflow, ); app.post("/api/aurum/approvals/submit", requireSession({ role:"controller" }), handleSubmitForApproval, ); app.post("/api/aurum/approvals/:id/approve", requireSession({ role:"auditor" }), handleApproveRequest, ); app.post("/api/aurum/approvals/:id/reject", requireSession({ role:"auditor" }), handleRejectRequest, ); app.post("/api/aurum/approvals/:id/delegate", requireSession({ role:"auditor" }), handleDelegateApproval, ); app.get("/api/aurum/approvals/queue", requireSession({ role:"auditor" }), handleGetApprovalQueue, ); app.get("/api/aurum/approvals/:id", requireSession({ role:"auditor" }), handleGetApprovalDetail, ); // ============================================================================ // STRIPE INTEGRATION ROUTES // ============================================================================ app.post("/api/aurum/integrations/stripe/oauth-callback", requireSession({ role:"admin" }), handleStripeOAuth, ); app.post("/api/aurum/integrations/stripe/config", requireSession({ role:"admin" }), handleStripeConfig, ); app.get("/api/aurum/integrations/stripe/status", requireSession({ role:"controller" }), handleStripeStatusEndpoint, ); app.post("/api/aurum/integrations/stripe/sync", requireSession({ role:"controller" }), handleSyncStripe, ); app.post("/api/aurum/integrations/stripe/reconcile", requireSession({ role:"controller" }), handleReconcileStripe, ); app.get("/api/aurum/integrations/stripe/transactions", requireSession({ role:"controller" }), handleGetStripeTransactions, ); app.post("/api/aurum/integrations/stripe/webhook", handleStripeWebhook); // Slack integration routes app.post("/api/aurum/integrations/slack/oauth-callback", requireSession({ role:"admin" }), handleSlackOAuth, ); app.post("/api/aurum/integrations/slack/config", requireSession({ role:"admin" }), handleSlackConfig, ); app.get("/api/aurum/integrations/slack/status", requireSession({ role:"controller" }), handleSlackStatusEndpoint, ); app.post("/api/aurum/integrations/slack/test", requireSession({ role:"admin" }), handleSlackTest, ); // Gusto integration routes app.post("/api/aurum/integrations/gusto/oauth-callback", requireSession({ role:"admin" }), handleGustoOAuth, ); app.post("/api/aurum/integrations/gusto/config", requireSession({ role:"admin" }), handleGustoConfig, ); app.get("/api/aurum/integrations/gusto/status", requireSession({ role:"controller" }), handleGustoStatusEndpoint, ); app.post("/api/aurum/integrations/gusto/sync", requireSession({ role:"controller" }), handleSyncGusto, ); // Toast POS integration routes app.post("/api/aurum/integrations/toast/config", requireSession({ role:"admin" }), handleToastConfig, ); app.get("/api/aurum/integrations/toast/status", requireSession({ role:"controller" }), handleToastStatusEndpoint, ); app.post("/api/aurum/integrations/toast/sync-revenue", requireSession({ role:"controller" }), handleSyncToastRevenueEndpoint, ); app.post("/api/aurum/integrations/toast/sync-cogs", requireSession({ role:"controller" }), handleSyncToastCogsEndpoint, ); app.post("/api/aurum/integrations/toast/detect-discrepancies", requireSession({ role:"controller" }), handleDetectDiscrepancies, ); app.get("/api/aurum/integrations/toast/discrepancies", requireSession({ role:"controller" }), handleGetDiscrepancies, ); return app;
}
