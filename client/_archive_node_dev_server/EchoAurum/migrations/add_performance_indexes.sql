/**
 * Performance Indexing Migration
 * Adds critical indexes to improve query performance
 * Target: <100ms for common queries, <500ms for complex queries
 */

-- Journal Entry Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_entity_date 
ON journal_entries(entityId, periodDate DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_entity_status 
ON journal_entries(entityId, status);

CREATE INDEX IF NOT EXISTS idx_journal_entries_source_reference 
ON journal_entries(source, referenceId);

CREATE INDEX IF NOT EXISTS idx_journal_entries_guardian 
ON journal_entries(guardianCheckStatus);

-- Journal Lines Indexes
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry 
ON journal_lines(entryId);

CREATE INDEX IF NOT EXISTS idx_journal_lines_account 
ON journal_lines(accountCode);

CREATE INDEX IF NOT EXISTS idx_journal_lines_amount 
ON journal_lines(debitAmount, creditAmount) 
WHERE debitAmount > 0 OR creditAmount > 0;

-- GL Account Indexes
CREATE INDEX IF NOT EXISTS idx_gl_accounts_entity_code 
ON gl_accounts(entityId, code);

CREATE INDEX IF NOT EXISTS idx_gl_accounts_type 
ON gl_accounts(accountType);

-- AP Invoice Indexes
CREATE INDEX IF NOT EXISTS idx_ap_invoices_entity_date 
ON ap_invoices(entityId, invoiceDate DESC);

CREATE INDEX IF NOT EXISTS idx_ap_invoices_vendor 
ON ap_invoices(vendorId, dueDate);

CREATE INDEX IF NOT EXISTS idx_ap_invoices_status 
ON ap_invoices(status, dueDate);

CREATE INDEX IF NOT EXISTS idx_ap_invoices_po_match 
ON ap_invoices(poNumber, entityId);

-- Payment Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_payments_entity_status 
ON stripe_payments(entityId, status);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_invoice 
ON stripe_payments(invoiceId);

-- Reconciliation Indexes
CREATE INDEX IF NOT EXISTS idx_reconciliations_entity_date 
ON reconciliations(entityId, reconciliationDate DESC);

CREATE INDEX IF NOT EXISTS idx_reconciliations_status 
ON reconciliations(status);

-- Approval Workflow Indexes
CREATE INDEX IF NOT EXISTS idx_approvals_approver_status 
ON approvals(approverId, status);

CREATE INDEX IF NOT EXISTS idx_approvals_transaction 
ON approvals(transactionId, transactionType);

CREATE INDEX IF NOT EXISTS idx_approvals_created_date 
ON approvals(createdAt DESC);

-- Audit Trail Indexes
CREATE INDEX IF NOT EXISTS idx_audit_transactions_user_action 
ON audit_transactions(userId, action);

CREATE INDEX IF NOT EXISTS idx_audit_transactions_table_record 
ON audit_transactions(tableName, recordId);

CREATE INDEX IF NOT EXISTS idx_audit_transactions_timestamp 
ON audit_transactions(timestamp DESC);

-- SOD Violation Indexes
CREATE INDEX IF NOT EXISTS idx_sod_violations_user 
ON sod_violations(userId, resolved);

CREATE INDEX IF NOT EXISTS idx_sod_violations_rule 
ON sod_violations(ruleId);

CREATE INDEX IF NOT EXISTS idx_sod_violations_timestamp 
ON sod_violations(violatedAt DESC);

-- User Role Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_entity 
ON user_roles(userId, entityId);

-- Toast Integration Indexes
CREATE INDEX IF NOT EXISTS idx_toast_revenue_entity_date 
ON toast_revenue(entityId, businessDate DESC);

CREATE INDEX IF NOT EXISTS idx_toast_revenue_location 
ON toast_revenue(locationId, businessDate);

CREATE INDEX IF NOT EXISTS idx_toast_cogs_entity_date 
ON toast_cogs(entityId, businessDate DESC);

-- Guardian Checks Indexes
CREATE INDEX IF NOT EXISTS idx_guardian_checks_transaction 
ON guardian_checks(transactionId, transactionType);

CREATE INDEX IF NOT EXISTS idx_guardian_checks_status 
ON guardian_checks(status);

CREATE INDEX IF NOT EXISTS idx_guardian_checks_guardian 
ON guardian_checks(guardianType);

-- Consolidation Indexes
CREATE INDEX IF NOT EXISTS idx_consolidation_entries_entity_date 
ON consolidation_entries(parentEntityId, consolidationDate DESC);

-- Query Performance Views (for common analytical queries)

-- View: GL Balance Summary (for fast balance sheet queries)
CREATE OR REPLACE VIEW v_gl_balances AS
SELECT 
  j.entityId,
  jl.accountCode,
  ga.accountName,
  ga.accountType,
  SUM(CASE WHEN j.status = 'posted' THEN jl.debitAmount ELSE 0 END) as totalDebit,
  SUM(CASE WHEN j.status = 'posted' THEN jl.creditAmount ELSE 0 END) as totalCredit,
  SUM(CASE WHEN j.status = 'posted' THEN (jl.debitAmount - jl.creditAmount) ELSE 0 END) as balance,
  MAX(j.periodDate) as lastUpdate
FROM journal_entries j
JOIN journal_lines jl ON j.id = jl.entryId
LEFT JOIN gl_accounts ga ON jl.accountCode = ga.code
WHERE j.status = 'posted'
GROUP BY j.entityId, jl.accountCode, ga.accountName, ga.accountType;

-- View: AP Aging Report (for fast AP aging queries)
CREATE OR REPLACE VIEW v_ap_aging AS
SELECT 
  ai.entityId,
  ai.vendorId,
  v.name as vendorName,
  ai.invoiceNumber,
  ai.invoiceDate,
  ai.dueDate,
  ai.totalAmount,
  ai.status,
  CURRENT_DATE - ai.dueDate as daysPastDue,
  CASE 
    WHEN CURRENT_DATE - ai.dueDate <= 0 THEN 'Not Due'
    WHEN CURRENT_DATE - ai.dueDate <= 30 THEN '1-30 Days'
    WHEN CURRENT_DATE - ai.dueDate <= 60 THEN '31-60 Days'
    WHEN CURRENT_DATE - ai.dueDate <= 90 THEN '61-90 Days'
    ELSE 'Over 90 Days'
  END as agingBucket
FROM ap_invoices ai
LEFT JOIN vendors v ON ai.vendorId = v.id
WHERE ai.status NOT IN ('paid', 'canceled');

-- View: Approval Queue Summary (for fast approval metrics)
CREATE OR REPLACE VIEW v_approval_queue AS
SELECT 
  a.approverId,
  COUNT(*) as pendingCount,
  COUNT(CASE WHEN a.createdAt < NOW() - INTERVAL '24 hours' THEN 1 END) as overdueCount,
  AVG(EXTRACT(EPOCH FROM (NOW() - a.createdAt))/3600) as avgAgeHours,
  SUM(a.amount) as totalAmount
FROM approvals a
WHERE a.status = 'pending'
GROUP BY a.approverId;

-- Analyze tables after creating indexes (for query optimizer)
-- Note: This is database-specific and may need adjustment
ANALYZE journal_entries;
ANALYZE journal_lines;
ANALYZE ap_invoices;
ANALYZE audit_transactions;
ANALYZE sod_violations;
ANALYZE user_roles;
ANALYZE toast_revenue;
