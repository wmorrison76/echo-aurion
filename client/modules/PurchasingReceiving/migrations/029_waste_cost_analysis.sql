-- Migration 029: Waste Cost Analysis & ROI Tracking
-- Adds: Cost breakdowns, supplier impact analysis, ROI tracking for prevention

-- ============================================================================
-- WASTE COST BREAKDOWN (By category, product, supplier)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_cost_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- By Category
  spoilage_cost DECIMAL(12, 2),
  overstock_cost DECIMAL(12, 2),
  damage_cost DECIMAL(12, 2),
  prep_loss_cost DECIMAL(12, 2),
  shrinkage_cost DECIMAL(12, 2),
  other_cost DECIMAL(12, 2),
  
  total_waste_cost DECIMAL(14, 2),
  
  -- Percentages
  spoilage_pct DECIMAL(5, 2),
  overstock_pct DECIMAL(5, 2),
  damage_pct DECIMAL(5, 2),
  prep_loss_pct DECIMAL(5, 2),
  shrinkage_pct DECIMAL(5, 2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, outlet_id, period_start)
);

CREATE INDEX waste_cost_breakdown_org_idx ON waste_cost_breakdown (organization_id, outlet_id, period_end DESC);

-- ============================================================================
-- SUPPLIER WASTE IMPACT (Track waste caused by supplier issues)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_waste_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  period_start DATE,
  period_end DATE,
  
  -- Waste caused by this supplier
  quality_issue_waste_cost DECIMAL(12, 2),  -- Damaged, defective products
  shelf_life_issue_waste_cost DECIMAL(12, 2),  -- Expired, short-dated
  packaging_damage_waste_cost DECIMAL(12, 2),
  incorrect_order_waste_cost DECIMAL(12, 2),  -- Over/under delivery
  
  total_waste_cost DECIMAL(14, 2),
  
  -- Metrics
  waste_incidents_count INTEGER,
  average_waste_per_incident DECIMAL(12, 2),
  
  supplier_quality_score DECIMAL(3, 2),  -- 0.0 - 1.0
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, supplier_id, outlet_id, period_start)
);

CREATE INDEX supplier_waste_impact_org_idx ON supplier_waste_impact (organization_id, supplier_id);
CREATE INDEX supplier_waste_impact_cost_idx ON supplier_waste_impact (total_waste_cost DESC);

-- ============================================================================
-- WASTE PREVENTION ROI TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_prevention_roi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prevention_action_id UUID NOT NULL REFERENCES waste_prevention_actions(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  -- Timeline
  implementation_start_date DATE,
  implementation_end_date DATE,
  tracking_period_start DATE,  -- When to start measuring ROI
  tracking_period_end DATE,
  
  -- Investment
  implementation_cost DECIMAL(12, 2),
  training_cost DECIMAL(12, 2),
  equipment_cost DECIMAL(12, 2),
  total_investment DECIMAL(14, 2),
  
  -- Returns (Savings)
  baseline_waste_cost DECIMAL(12, 2),  -- Before action
  post_action_waste_cost DECIMAL(12, 2),  -- After action
  total_savings DECIMAL(14, 2),  -- baseline - post_action
  
  -- ROI Calculation
  roi_percentage DECIMAL(6, 2),  -- (total_savings - total_investment) / total_investment * 100
  payback_period_days INTEGER,
  annualized_roi DECIMAL(6, 2),
  
  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  effectiveness_rating TEXT CHECK (effectiveness_rating IN ('poor', 'fair', 'good', 'excellent')),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_prevention_roi_org_idx ON waste_prevention_roi (organization_id, outlet_id);
CREATE INDEX waste_prevention_roi_action_idx ON waste_prevention_roi (prevention_action_id);
CREATE INDEX waste_prevention_roi_savings_idx ON waste_prevention_roi (total_savings DESC);

-- ============================================================================
-- WASTE BENCHMARKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Benchmark Type
  benchmark_type TEXT NOT NULL CHECK (benchmark_type IN ('internal_historical', 'industry_standard', 'competitor', 'best_practice')),
  
  category TEXT,  -- 'spoilage', 'overstock', etc
  outlet_type TEXT,  -- 'restaurant', 'cafe', 'bar', 'catering'
  
  -- Metrics
  waste_percentage_target DECIMAL(5, 2),  -- Target waste as % of purchases
  waste_cost_per_outlet_per_day DECIMAL(10, 2),
  waste_cost_per_serving DECIMAL(10, 2),
  
  -- Source
  source_description TEXT,
  data_period_start DATE,
  data_period_end DATE,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_benchmarks_org_idx ON waste_benchmarks (organization_id, benchmark_type);

-- ============================================================================
-- WASTE REPORTS (Pre-generated for quick access)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Summary
  total_waste_count INTEGER,
  total_waste_cost DECIMAL(14, 2),
  total_disposal_cost DECIMAL(14, 2),
  net_waste_cost DECIMAL(14, 2),
  
  -- Metrics
  waste_as_percentage_of_purchases DECIMAL(5, 2),
  waste_per_day_average DECIMAL(10, 2),
  
  -- Top Issues
  top_waste_category TEXT,
  top_wasted_product_id UUID,
  top_root_cause TEXT,
  
  -- Comparison
  vs_budget DECIMAL(6, 2),  -- % over/under budget
  vs_previous_period DECIMAL(6, 2),  -- % change from prior period
  vs_benchmark DECIMAL(6, 2),  -- % vs industry benchmark
  
  -- Report Content
  summary_text TEXT,
  recommendations TEXT,
  report_data JSONB DEFAULT '{}'::JSONB,  -- Detailed data
  
  generated_by TEXT,  -- System or user
  generated_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_reports_org_idx ON waste_reports (organization_id, outlet_id, period_end DESC);
CREATE INDEX waste_reports_type_idx ON waste_reports (report_type, organization_id);

-- ============================================================================
-- WASTE COMPLIANCE & CERTIFICATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_disposal_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  disposal_id UUID REFERENCES waste_disposals(id) ON DELETE CASCADE,
  
  -- Compliance Requirement
  requirement_name TEXT NOT NULL,  -- 'Food waste disposal', 'Hazmat disposal', etc
  regulation TEXT,  -- e.g., 'EPA 40 CFR 262'
  jurisdiction TEXT,  -- 'US EPA', 'Local Health Dept', etc
  
  -- Compliance Status
  is_compliant BOOLEAN DEFAULT TRUE,
  compliance_checked_by TEXT,
  compliance_checked_at TIMESTAMPTZ,
  
  -- Certification
  certificate_number TEXT,
  certificate_valid_from DATE,
  certificate_valid_until DATE,
  certificate_url TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX waste_disposal_compliance_org_idx ON waste_disposal_compliance (organization_id, outlet_id);
CREATE INDEX waste_disposal_compliance_date_idx ON waste_disposal_compliance (certificate_valid_until);

-- ============================================================================
-- ENVIRONMENTAL IMPACT TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_environmental_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Waste Metrics
  total_waste_kg DECIMAL(10, 3),
  landfill_waste_kg DECIMAL(10, 3),
  recycled_waste_kg DECIMAL(10, 3),
  composted_waste_kg DECIMAL(10, 3),
  donated_food_kg DECIMAL(10, 3),
  
  -- Environmental Impact
  co2_emissions_kg DECIMAL(10, 3),  -- Equivalent emissions from waste
  water_waste_liters DECIMAL(12, 3),
  
  -- Sustainability Score
  sustainability_score DECIMAL(3, 2),  -- 0.0 - 1.0
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, outlet_id, period_start)
);

CREATE INDEX waste_environmental_impact_org_idx ON waste_environmental_impact (organization_id, outlet_id, period_end DESC);
