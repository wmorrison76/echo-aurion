-- Migration 030: Waste Tracking RLS Policies
-- Enforces multi-tenant data isolation for waste tracking tables

-- ============================================================================
-- WASTE_LOGS RLS
-- ============================================================================
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_logs_select_policy ON waste_logs FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_logs_insert_policy ON waste_logs FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_logs_update_policy ON waste_logs FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_DISPOSALS RLS
-- ============================================================================
ALTER TABLE waste_disposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_disposals_select_policy ON waste_disposals FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_disposals_insert_policy ON waste_disposals FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_disposals_update_policy ON waste_disposals FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_DAILY_SUMMARY RLS
-- ============================================================================
ALTER TABLE waste_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_daily_summary_select_policy ON waste_daily_summary FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_MONTHLY_METRICS RLS
-- ============================================================================
ALTER TABLE waste_monthly_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_monthly_metrics_select_policy ON waste_monthly_metrics FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_VARIANCE_ANALYSIS RLS
-- ============================================================================
ALTER TABLE waste_variance_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_variance_analysis_select_policy ON waste_variance_analysis FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_variance_analysis_insert_policy ON waste_variance_analysis FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_PREVENTION_ACTIONS RLS
-- ============================================================================
ALTER TABLE waste_prevention_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_prevention_actions_select_policy ON waste_prevention_actions FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_prevention_actions_insert_policy ON waste_prevention_actions FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_prevention_actions_update_policy ON waste_prevention_actions FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_ALERT_THRESHOLDS RLS
-- ============================================================================
ALTER TABLE waste_alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_alert_thresholds_select_policy ON waste_alert_thresholds FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_alert_thresholds_insert_policy ON waste_alert_thresholds FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_alert_thresholds_update_policy ON waste_alert_thresholds FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_ALERTS RLS
-- ============================================================================
ALTER TABLE waste_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_alerts_select_policy ON waste_alerts FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_alerts_insert_policy ON waste_alerts FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_alerts_update_policy ON waste_alerts FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_COST_BREAKDOWN RLS
-- ============================================================================
ALTER TABLE waste_cost_breakdown ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_cost_breakdown_select_policy ON waste_cost_breakdown FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- SUPPLIER_WASTE_IMPACT RLS
-- ============================================================================
ALTER TABLE supplier_waste_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY supplier_waste_impact_select_policy ON supplier_waste_impact FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_PREVENTION_ROI RLS
-- ============================================================================
ALTER TABLE waste_prevention_roi ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_prevention_roi_select_policy ON waste_prevention_roi FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_prevention_roi_insert_policy ON waste_prevention_roi FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_REPORTS RLS
-- ============================================================================
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_reports_select_policy ON waste_reports FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_reports_insert_policy ON waste_reports FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_DISPOSAL_COMPLIANCE RLS
-- ============================================================================
ALTER TABLE waste_disposal_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_disposal_compliance_select_policy ON waste_disposal_compliance FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY waste_disposal_compliance_insert_policy ON waste_disposal_compliance FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- WASTE_ENVIRONMENTAL_IMPACT RLS
-- ============================================================================
ALTER TABLE waste_environmental_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY waste_environmental_impact_select_policy ON waste_environmental_impact FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);
