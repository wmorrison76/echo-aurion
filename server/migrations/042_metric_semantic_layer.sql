/**
 * Metric Semantic Layer Schema
 * Provides unified metric definitions, calculations, and reporting
 */

-- =====================================================
-- METRIC DEFINITIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- NULL for system-wide metrics
  
  -- Metric definition
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- e.g., "revenue", "labor", "inventory", "guest_experience"
  type VARCHAR(50) NOT NULL, -- "count", "sum", "avg", "min", "max", "percentile", "rate", "ratio"
  granularity TEXT[] NOT NULL, -- ["hour", "day", "week", "month", "quarter", "year"]
  
  -- Calculation
  formula TEXT, -- Calculation formula (e.g., "metric.revenue_total - metric.revenue_refunds")
  sql_query TEXT, -- SQL query for the metric
  
  -- Display
  unit VARCHAR(50), -- e.g., "USD", "hours", "count", "%"
  format VARCHAR(50) DEFAULT 'number', -- "number", "currency", "percentage", "duration"
  
  -- Dimensions and tags
  dimensions TEXT[], -- e.g., ["outlet_id", "department", "employee_id"]
  tags TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_metric_name UNIQUE (org_id, name)
);

CREATE INDEX idx_metric_definitions_org ON metric_definitions(org_id);
CREATE INDEX idx_metric_definitions_category ON metric_definitions(category);
CREATE INDEX idx_metric_definitions_name ON metric_definitions(name);
CREATE INDEX idx_metric_definitions_active ON metric_definitions(is_active) WHERE is_active = TRUE;

-- =====================================================
-- METRIC VALUES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS metric_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  -- Value
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value NUMERIC NOT NULL,
  
  -- Dimensions (JSONB for flexible grouping)
  dimensions JSONB, -- e.g., {"outlet_id": "...", "department": "kitchen"}
  
  -- Metadata
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT unique_metric_timestamp_dimensions UNIQUE (metric_id, org_id, timestamp, dimensions)
);

CREATE INDEX idx_metric_values_metric ON metric_values(metric_id);
CREATE INDEX idx_metric_values_org ON metric_values(org_id);
CREATE INDEX idx_metric_values_timestamp ON metric_values(timestamp DESC);
CREATE INDEX idx_metric_values_dimensions ON metric_values USING GIN (dimensions);

-- =====================================================
-- REPORT TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- NULL for system-wide templates
  
  -- Template definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  
  -- Metrics and configuration
  metrics UUID[] NOT NULL, -- Array of metric IDs
  time_range JSONB NOT NULL, -- { default: "last_30_days", options: ["last_7_days", ...] }
  grouping TEXT[], -- Dimensions to group by
  
  -- Format
  format VARCHAR(50) DEFAULT 'table', -- "table", "chart", "dashboard"
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_report_templates_org ON report_templates(org_id);
CREATE INDEX idx_report_templates_category ON report_templates(category);
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE is_active = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY metric_definitions_tenant_isolation ON metric_definitions
  FOR ALL
  USING (org_id IS NULL OR org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY metric_values_tenant_isolation ON metric_values
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY report_templates_tenant_isolation ON report_templates
  FOR ALL
  USING (org_id IS NULL OR org_id = current_setting('app.current_org_id')::uuid);

-- =====================================================
-- SAMPLE METRIC DEFINITIONS
-- =====================================================

-- Revenue metrics
INSERT INTO metric_definitions (name, display_name, description, category, type, granularity, sql_query, unit, format)
VALUES (
  'revenue_total',
  'Total Revenue',
  'Total revenue from all sources',
  'revenue',
  'sum',
  ARRAY['day', 'week', 'month', 'quarter', 'year'],
  'SELECT COALESCE(SUM(amount), 0) as value FROM pos_checks WHERE org_id = {org_id} AND created_at >= {start_date} AND created_at <= {end_date}',
  'USD',
  'currency'
),
(
  'revenue_per_check',
  'Revenue Per Check',
  'Average revenue per check',
  'revenue',
  'avg',
  ARRAY['day', 'week', 'month'],
  'SELECT COALESCE(AVG(amount), 0) as value FROM pos_checks WHERE org_id = {org_id} AND created_at >= {start_date} AND created_at <= {end_date}',
  'USD',
  'currency'
),
(
  'labor_cost_percentage',
  'Labor Cost Percentage',
  'Labor cost as percentage of revenue',
  'labor',
  'ratio',
  ARRAY['week', 'month', 'quarter'],
  'SELECT COALESCE((SUM(labor_cost) / NULLIF(SUM(revenue), 0)) * 100, 0) as value FROM labor_metrics WHERE org_id = {org_id} AND period_start >= {start_date} AND period_end <= {end_date}',
  '%',
  'percentage'
)
ON CONFLICT DO NOTHING;
