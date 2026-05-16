-- Production Indexes for 99.98% Performance
-- Target: <50ms p95, <100ms p99 query latency

-- Invoice indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_status_date 
  ON invoices(organization_id, status, invoice_date DESC)
  WHERE status IN ('pending', 'approved');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_vendor_date 
  ON invoices(vendor_id, invoice_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_org_created 
  ON invoices(organization_id, created_at DESC);

-- Invoice items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_invoice_org 
  ON invoice_items(invoice_id, organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_category 
  ON invoice_items(organization_id, category) 
  WHERE category IS NOT NULL;

-- Inventory indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_org_category_updated 
  ON inventory_items(organization_id, category, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_vendor 
  ON inventory_items(organization_id, vendor_id) 
  WHERE vendor_id IS NOT NULL;

-- Trace ledger indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trace_ledger_org_source_created 
  ON trace_ledger(org_id, source_ref, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trace_ledger_org_type 
  ON trace_ledger(org_id, transaction_type, created_at DESC);

-- GL postings indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gl_postings_org_period_posted 
  ON gl_postings(organization_id, period, posted_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gl_postings_org_account 
  ON gl_postings(organization_id, account_code, period);

-- P&L calculation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pnl_outlet_period 
  ON pnl_reports(outlet_id, period, calculated_at DESC);

-- Recipe indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_org_category 
  ON recipes(organization_id, category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_org_updated 
  ON recipes(organization_id, updated_at DESC);

-- Materialized views for complex aggregations (refresh every 5 min)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_invoice_summary_daily AS
SELECT 
  organization_id,
  DATE(invoice_date) as date,
  COUNT(*) as total_invoices,
  SUM(total_amount) as total_amount,
  AVG(total_amount) as avg_amount,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
FROM invoices
GROUP BY organization_id, DATE(invoice_date);

CREATE UNIQUE INDEX ON mv_invoice_summary_daily(organization_id, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_snapshot AS
SELECT 
  organization_id,
  item_id,
  SUM(quantity) as total_quantity,
  AVG(unit_cost) as avg_cost,
  MAX(updated_at) as last_updated
FROM inventory_lots
GROUP BY organization_id, item_id;

CREATE UNIQUE INDEX ON mv_inventory_snapshot(organization_id, item_id);

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_invoice_summary_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Slow query monitoring table
CREATE TABLE IF NOT EXISTS slow_queries (
  id BIGSERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  organization_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON slow_queries(created_at DESC);
CREATE INDEX ON slow_queries(organization_id, created_at DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
  p_query_text TEXT,
  p_duration_ms INTEGER,
  p_organization_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO slow_queries (query_text, duration_ms, organization_id)
  VALUES (p_query_text, p_duration_ms, p_organization_id);
END;
$$ LANGUAGE plpgsql;
