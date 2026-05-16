-- Migration 021: Performance Indexes & Optimizations
-- Ensures query performance for 25+ outlet multi-unit organizations

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Organizations & Outlets (very common filter)
CREATE INDEX IF NOT EXISTS idx_outlets_org_active 
  ON outlets (organization_id, active) 
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_outlets_outlet_group_active
  ON outlets (outlet_group_id, active)
  WHERE active = TRUE;

-- Suppliers filtering
CREATE INDEX IF NOT EXISTS idx_approved_suppliers_org_status
  ON approved_suppliers (organization_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_approved_suppliers_outlet_category
  ON approved_suppliers (outlet_id, category_tier1_id, status)
  WHERE status = 'active';

-- Purchase Orders (most critical for ordering volume)
CREATE INDEX IF NOT EXISTS idx_po_org_outlet_status
  ON purchase_orders (organization_id, outlet_id, status);

CREATE INDEX IF NOT EXISTS idx_po_dates
  ON purchase_orders (created_at DESC)
  INCLUDE (organization_id, outlet_id, status, vendor_id);

CREATE INDEX IF NOT EXISTS idx_po_3way_incomplete
  ON purchase_orders (organization_id, three_way_match_status)
  WHERE three_way_match_status IN ('pending', 'variance_identified');

-- Invoices (high query volume for reporting)
CREATE INDEX IF NOT EXISTS idx_invoices_org_vendor_date
  ON invoices (organization_id, vendor_id, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_outlet_date
  ON invoices (outlet_id, invoice_date DESC)
  INCLUDE (vendor_id, total, payment_status);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_status
  ON invoices (organization_id, payment_status, due_date DESC);

-- Invoice Lines (for variance analysis)
CREATE INDEX IF NOT EXISTS idx_invoice_lines_variance
  ON invoice_lines (invoice_id, line_match_status)
  WHERE line_match_status IN ('variance', 'disputed');

-- Receiving (high insert rate during receiving)
CREATE INDEX IF NOT EXISTS idx_receiving_outlet_date
  ON receiving_transactions (outlet_id, received_date DESC);

CREATE INDEX IF NOT EXISTS idx_receiving_po_status
  ON receiving_transactions (po_id, receiving_status);

-- ASN (critical for 3-way matching)
CREATE INDEX IF NOT EXISTS idx_asn_po_status
  ON asn_headers (po_id, asn_match_status);

-- Products (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products (tier1_id, tier2_id, tier3_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_org_active
  ON products (organization_id, active)
  WHERE active = TRUE;

-- Supplier Performance (reporting)
CREATE INDEX IF NOT EXISTS idx_supplier_perf_date
  ON supplier_performance_metrics (organization_id, supplier_id, metric_date DESC);

-- GL Posting (for reconciliation)
CREATE INDEX IF NOT EXISTS idx_gl_posting_date_code
  ON gl_posting_journal (organization_id, post_date DESC, gl_code_id);

CREATE INDEX IF NOT EXISTS idx_gl_posting_outlet_date
  ON gl_posting_journal (outlet_id, post_date DESC);

-- RFQ (for status tracking)
CREATE INDEX IF NOT EXISTS idx_rfq_status_deadline
  ON rfq_headers (organization_id, status, response_deadline)
  WHERE status IN ('published', 'closed');

-- Rebate Accruals (for payment processing)
CREATE INDEX IF NOT EXISTS idx_rebate_accrual_status
  ON rebate_accruals (organization_id, payment_status, accrual_end_date);

-- ============================================================================
-- PARTIAL INDEXES (For common WHERE conditions)
-- ============================================================================

-- Active vendors only
CREATE INDEX IF NOT EXISTS idx_vendors_active_org
  ON vendors (organization_id)
  WHERE compliance_status = 'verified';

-- Recent purchase orders
CREATE INDEX IF NOT EXISTS idx_po_recent_active
  ON purchase_orders (organization_id)
  WHERE status IN ('created', 'sent', 'confirmed', 'shipped')
  AND created_at > CURRENT_DATE - INTERVAL '90 days';

-- Overdue invoices
CREATE INDEX IF NOT EXISTS idx_invoices_overdue
  ON invoices (organization_id, due_date)
  WHERE payment_status = 'unpaid'
  AND due_date < CURRENT_DATE;

-- Pending receiving
CREATE INDEX IF NOT EXISTS idx_receiving_queue_pending
  ON receiving_queue (organization_id)
  WHERE status IN ('pending', 'in_progress');

-- ============================================================================
-- TABLE STATISTICS & ANALYSIS
-- ============================================================================

-- Analyze all tables for query planner
ANALYZE organizations;
ANALYZE outlets;
ANALYZE outlet_groups;
ANALYZE vendors;
ANALYZE approved_suppliers;
ANALYZE products;
ANALYZE purchase_orders;
ANALYZE purchase_order_lines;
ANALYZE invoices;
ANALYZE invoice_lines;
ANALYZE asn_headers;
ANALYZE receiving_transactions;
ANALYZE supplier_performance_metrics;
ANALYZE supplier_contracts;
ANALYZE supplier_certifications;
ANALYZE rfq_headers;
ANALYZE rebate_accruals;
ANALYZE gl_posting_journal;

-- ============================================================================
-- MATERIALIZED VIEWS FOR REPORTING (Refresh periodically)
-- ============================================================================

-- Organization spend summary (fast reporting)
CREATE MATERIALIZED VIEW IF NOT EXISTS org_spend_summary AS
SELECT
  i.organization_id,
  DATE_TRUNC('month', i.invoice_date)::DATE as period,
  v.id as vendor_id,
  v.name as vendor_name,
  COUNT(*) as invoice_count,
  SUM(i.total) as total_amount,
  AVG(i.total) as avg_invoice,
  COUNT(DISTINCT i.outlet_id) as outlets_purchasing
FROM invoices i
JOIN vendors v ON i.vendor_id = v.id
WHERE i.status != 'error'
GROUP BY i.organization_id, DATE_TRUNC('month', i.invoice_date), v.id, v.name;

CREATE UNIQUE INDEX idx_org_spend_summary 
  ON org_spend_summary (organization_id, period, vendor_id);

-- Outlet monthly consumption (for forecasting)
CREATE MATERIALIZED VIEW IF NOT EXISTS outlet_monthly_consumption AS
SELECT
  i.outlet_id,
  DATE_TRUNC('month', i.invoice_date)::DATE as month,
  il.product_id,
  SUM(il.qty_ordered) as total_qty,
  SUM(il.qty_ordered * il.unit_price) as total_cost
FROM invoices i
JOIN invoice_lines il ON i.id = il.invoice_id
WHERE i.status != 'error'
  AND il.product_id IS NOT NULL
GROUP BY i.outlet_id, DATE_TRUNC('month', i.invoice_date), il.product_id;

CREATE UNIQUE INDEX idx_outlet_consumption
  ON outlet_monthly_consumption (outlet_id, month, product_id);

-- ============================================================================
-- GRANT PERMISSIONS (Update as needed for your roles)
-- ============================================================================

-- These permissions will be set per your RBAC model
-- GRANT SELECT ON organizations TO authenticated;
-- GRANT SELECT ON outlets TO authenticated;
-- etc...

-- ============================================================================
-- NOTE: Table Partitioning Strategy (for future scaling beyond 100M rows)
-- ============================================================================
-- When invoices/po/receiving exceed 50M rows, partition by organization_id:
--
-- ALTER TABLE invoices PARTITION BY HASH (organization_id) PARTITIONS 20;
-- ALTER TABLE purchase_orders PARTITION BY HASH (organization_id) PARTITIONS 20;
-- ALTER TABLE receiving_transactions PARTITION BY HASH (organization_id) PARTITIONS 20;
-- ALTER TABLE invoice_lines PARTITION BY RANGE (created_at) 
--   (PARTITION y2024q1 VALUES LESS THAN ('2024-04-01'),
--    PARTITION y2024q2 VALUES LESS THAN ('2024-07-01'), ...);
--
-- This improves query performance for very large tables.

-- ============================================================================
-- SCHEMA VERSION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO schema_migrations (version, name) VALUES
  (10, 'organizations_multiunit'),
  (11, 'products_sku_master'),
  (12, 'suppliers_asl'),
  (13, 'supplier_certifications'),
  (14, 'supplier_contracts'),
  (15, 'gl_accounts'),
  (16, 'purchase_orders_extended'),
  (17, 'receiving_asn'),
  (18, 'invoices_extended'),
  (19, 'rfq_workflow'),
  (20, 'rebate_accruals'),
  (21, 'performance_indexes')
ON CONFLICT (version) DO NOTHING;
