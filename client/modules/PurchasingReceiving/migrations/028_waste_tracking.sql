-- Migration 028: Waste Tracking Core
-- Adds: Waste logs, disposal methods, cost tracking, variance analysis

-- ============================================================================
-- DISPOSAL METHODS (Enum-like)
-- ============================================================================
CREATE TABLE IF NOT EXISTS disposal_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('trash', 'compost', 'recycling', 'donation', 'hazmat', 'return', 'other')),
  environmental_rating TEXT CHECK (environmental_rating IN ('excellent', 'good', 'fair', 'poor')),
  description TEXT,
  cost_per_unit DECIMAL(10, 2),  -- Cost to dispose (negative = revenue)
  unit TEXT,  -- 'kg', 'count', 'liter', etc
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX disposal_methods_category_idx ON disposal_methods (category);
CREATE INDEX disposal_methods_active_idx ON disposal_methods (is_active) WHERE is_active = TRUE;

-- ============================================================================
-- WASTE LOGS (Main waste tracking table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  product_code TEXT,
  
  -- Waste Details
  quantity_wasted DECIMAL(10, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,  -- 'kg', 'liter', 'count', 'serving', etc
  cost_per_unit DECIMAL(10, 2) NOT NULL,  -- Purchase cost
  total_waste_cost DECIMAL(12, 2) NOT NULL,  -- quantity * cost_per_unit
  
  -- Reason & Category
  waste_category TEXT NOT NULL CHECK (waste_category IN ('spoilage', 'overstock', 'damage', 'prep_loss', 'shrinkage', 'theft', 'customer_return', 'quality_issue', 'recall', 'other')),
  waste_reason TEXT,  -- More detailed reason
  root_cause TEXT,  -- 'forecast_error', 'over_ordering', 'poor_storage', 'handling_damage', etc
  
  -- Disposal
  disposal_method_id UUID REFERENCES disposal_methods(id) ON DELETE SET NULL,
  disposal_cost DECIMAL(10, 2),  -- Cost or revenue from disposal
  net_waste_cost DECIMAL(12, 2),  -- total_waste_cost - disposal_cost
  
  -- Metadata
  notes TEXT,
  photo_url TEXT,  -- Photo of waste (optional)
  
  -- Tracking
  logged_by TEXT,  -- User email
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_logs_org_idx ON waste_logs (organization_id, outlet_id, created_at DESC);
CREATE INDEX waste_logs_product_idx ON waste_logs (product_id);
CREATE INDEX waste_logs_category_idx ON waste_logs (waste_category);
CREATE INDEX waste_logs_root_cause_idx ON waste_logs (root_cause);
CREATE INDEX waste_logs_cost_idx ON waste_logs (total_waste_cost DESC);
CREATE INDEX waste_logs_date_idx ON waste_logs (logged_at DESC);

-- ============================================================================
-- WASTE CATEGORIES (Master list for UI dropdowns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_category_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  typical_root_causes TEXT[] DEFAULT ARRAY[]::TEXT[],
  preventable BOOLEAN DEFAULT TRUE,
  tracking_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- WASTE DISPOSAL HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_disposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_log_id UUID NOT NULL REFERENCES waste_logs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  disposal_method_id UUID NOT NULL REFERENCES disposal_methods(id) ON DELETE RESTRICT,
  disposal_date DATE NOT NULL,
  disposal_time TIME,
  quantity_disposed DECIMAL(10, 3),
  unit_of_measure TEXT,
  
  disposed_by TEXT,  -- User email
  picked_up_by TEXT,  -- Third party (if applicable)
  
  carrier_name TEXT,  -- If using external disposal service
  tracking_number TEXT,  -- For third-party disposal tracking
  
  cost DECIMAL(10, 2),  -- Actual cost incurred
  revenue DECIMAL(10, 2),  -- If sold (e.g., recycling revenue)
  
  certificate_url TEXT,  -- Disposal certificate (for compliance)
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_disposals_org_idx ON waste_disposals (organization_id, outlet_id, disposal_date DESC);
CREATE INDEX waste_disposals_method_idx ON waste_disposals (disposal_method_id);
CREATE INDEX waste_disposals_waste_log_idx ON waste_disposals (waste_log_id);

-- ============================================================================
-- DAILY WASTE AGGREGATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  day_date DATE NOT NULL,
  
  total_waste_count INTEGER,  -- Number of waste logs
  total_quantity_wasted DECIMAL(10, 3),
  total_waste_cost DECIMAL(12, 2),
  total_disposal_cost DECIMAL(12, 2),
  net_waste_cost DECIMAL(12, 2),
  
  by_category JSONB DEFAULT '{}'::JSONB,  -- {spoilage: 150, overstock: 75, etc}
  top_wasted_products JSONB DEFAULT '{}'::JSONB,  -- {product_name: cost, ...}
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, outlet_id, day_date)
);

CREATE INDEX waste_daily_summary_org_idx ON waste_daily_summary (organization_id, outlet_id, day_date DESC);
CREATE INDEX waste_daily_summary_cost_idx ON waste_daily_summary (net_waste_cost DESC);

-- ============================================================================
-- MONTHLY WASTE METRICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_monthly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  year_month DATE NOT NULL,  -- First day of month
  
  total_waste_cost DECIMAL(14, 2),
  total_disposal_cost DECIMAL(14, 2),
  net_waste_cost DECIMAL(14, 2),
  
  -- Metrics
  waste_percentage DECIMAL(5, 2),  -- % of purchased cost
  spoilage_percentage DECIMAL(5, 2),
  preventable_waste_percentage DECIMAL(5, 2),
  
  -- Top issues
  most_wasted_category TEXT,
  most_wasted_product_id UUID,
  
  -- Trend
  vs_previous_month_change DECIMAL(5, 2),  -- % change
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, outlet_id, year_month)
);

CREATE INDEX waste_monthly_metrics_org_idx ON waste_monthly_metrics (organization_id, outlet_id, year_month DESC);

-- ============================================================================
-- WASTE VARIANCE ANALYSIS
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_variance_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  analysis_period TEXT,  -- 'daily', 'weekly', 'monthly'
  period_start DATE,
  period_end DATE,
  
  -- Expected vs Actual
  expected_waste_percentage DECIMAL(5, 2),  -- Industry standard
  actual_waste_percentage DECIMAL(5, 2),
  variance_percentage DECIMAL(6, 2),  -- positive = worse than expected
  variance_amount DECIMAL(12, 2),  -- Cost difference
  
  -- Analysis
  variance_type TEXT CHECK (variance_type IN ('favorable', 'unfavorable')),
  significance_level TEXT CHECK (significance_level IN ('low', 'medium', 'high', 'critical')),
  contributing_factors JSONB DEFAULT '{}'::JSONB,
  
  recommendations TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_variance_analysis_org_idx ON waste_variance_analysis (organization_id, outlet_id, period_end DESC);
CREATE INDEX waste_variance_analysis_product_idx ON waste_variance_analysis (product_id);

-- ============================================================================
-- WASTE PREVENTION ACTIONS (Track corrective actions taken)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_prevention_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Action Type
  action_type TEXT NOT NULL CHECK (action_type IN ('process_change', 'training', 'equipment_upgrade', 'supplier_change', 'ordering_adjustment', 'storage_improvement', 'menu_change', 'other')),
  
  -- Target
  target_waste_category TEXT,  -- Which type of waste to prevent
  target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Tracking
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'cancelled')),
  owner TEXT,  -- User email
  
  expected_cost_savings DECIMAL(12, 2),
  implementation_cost DECIMAL(12, 2),
  
  target_date DATE,
  completed_date DATE,
  
  effectiveness_notes TEXT,
  actual_savings DECIMAL(12, 2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_prevention_actions_org_idx ON waste_prevention_actions (organization_id, outlet_id);
CREATE INDEX waste_prevention_actions_status_idx ON waste_prevention_actions (status);
CREATE INDEX waste_prevention_actions_category_idx ON waste_prevention_actions (target_waste_category);

-- ============================================================================
-- WASTE ALERTS & THRESHOLDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('daily_cost', 'category_percentage', 'product_specific', 'variance_threshold')),
  
  metric TEXT NOT NULL,  -- 'total_waste_cost', 'spoilage_percentage', etc
  threshold_value DECIMAL(12, 2),
  threshold_unit TEXT,  -- '$', '%', 'kg', etc
  
  alert_severity TEXT DEFAULT 'warning' CHECK (alert_severity IN ('info', 'warning', 'critical')),
  alert_enabled BOOLEAN DEFAULT TRUE,
  
  notify_roles TEXT[] DEFAULT ARRAY['outlet_manager'],
  notify_channels TEXT[] DEFAULT ARRAY['in_app'],
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_alert_thresholds_org_idx ON waste_alert_thresholds (organization_id, outlet_id);

-- ============================================================================
-- WASTE ALERTS (Instances when thresholds are triggered)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  threshold_id UUID REFERENCES waste_alert_thresholds(id) ON DELETE SET NULL,
  
  alert_type TEXT NOT NULL,
  alert_message TEXT,
  
  metric_value DECIMAL(12, 2),
  threshold_value DECIMAL(12, 2),
  
  severity TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_alerts_org_idx ON waste_alerts (organization_id, outlet_id, created_at DESC);
CREATE INDEX waste_alerts_status_idx ON waste_alerts (status) WHERE status IN ('open', 'acknowledged');
