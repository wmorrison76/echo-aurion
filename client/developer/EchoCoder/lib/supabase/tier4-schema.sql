-- TIER 4 ENTERPRISE SCHEMA
-- Advanced analytics, A/B testing, audience targeting, image optimization, predictive insights

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- A/B TESTING FRAMEWORK
-- ============================================

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, running, paused, completed, archived
  test_type VARCHAR(50) NOT NULL DEFAULT 'variant', -- variant, multivariate, split-url
  target_metric VARCHAR(100),
  minimum_sample_size INTEGER DEFAULT 100,
  minimum_confidence_level NUMERIC(3, 2) DEFAULT 0.95,
  hypothesis TEXT,
  expected_lift NUMERIC(5, 2),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  scheduled_end_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_ab_status CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  CONSTRAINT valid_test_type CHECK (test_type IN ('variant', 'multivariate', 'split-url'))
);

CREATE INDEX idx_ab_tests_workspace ON ab_tests(workspace_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(workspace_id, status);
CREATE INDEX idx_ab_tests_started ON ab_tests(started_at);

CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  allocation_percentage INTEGER NOT NULL DEFAULT 50 CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  content JSONB NOT NULL,
  is_control BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_id, name)
);

CREATE INDEX idx_variants_test ON ab_test_variants(test_id);

CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  user_id UUID,
  session_id VARCHAR(255),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_id, user_id, session_id)
);

CREATE INDEX idx_assignments_test ON ab_test_assignments(test_id);
CREATE INDEX idx_assignments_variant ON ab_test_assignments(variant_id);
CREATE INDEX idx_assignments_user ON ab_test_assignments(user_id);

CREATE TABLE IF NOT EXISTS ab_test_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES ab_test_assignments(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_metrics_assignment ON ab_test_metrics(assignment_id);
CREATE INDEX idx_test_metrics_metric ON ab_test_metrics(metric_name);

CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  sample_size INTEGER NOT NULL,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5, 4),
  average_value NUMERIC(12, 4),
  statistical_significance NUMERIC(3, 2),
  confidence_level NUMERIC(3, 2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_id, variant_id)
);

-- ============================================
-- AUDIENCE TARGETING AND SEGMENTATION
-- ============================================

CREATE TABLE IF NOT EXISTS audience_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  match_type VARCHAR(50) DEFAULT 'all', -- all, any
  size_estimate INTEGER,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_segments_workspace ON audience_segments(workspace_id);
CREATE INDEX idx_segments_active ON audience_segments(workspace_id, active);

CREATE TABLE IF NOT EXISTS segment_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_id UUID NOT NULL REFERENCES audience_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(segment_id, user_id)
);

CREATE INDEX idx_memberships_segment ON segment_memberships(segment_id);
CREATE INDEX idx_memberships_user ON segment_memberships(user_id);

CREATE TABLE IF NOT EXISTS targeting_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 1,
  segments UUID[] DEFAULT '{}',
  properties JSONB,
  actions JSONB NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_targeting_rules_workspace ON targeting_rules(workspace_id);
CREATE INDEX idx_targeting_rules_active ON targeting_rules(workspace_id, active);

-- ============================================
-- IMAGE OPTIMIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS image_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_path VARCHAR(2048) NOT NULL,
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  format VARCHAR(20), -- jpg, png, webp, avif
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, file_name)
);

CREATE INDEX idx_images_workspace ON image_assets(workspace_id);

CREATE TABLE IF NOT EXISTS image_optimizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL REFERENCES image_assets(id) ON DELETE CASCADE,
  optimization_type VARCHAR(50), -- compression, format_conversion, resize, webp
  input_size_bytes BIGINT,
  output_size_bytes BIGINT,
  quality_level INTEGER CHECK (quality_level >= 0 AND quality_level <= 100),
  output_format VARCHAR(20),
  output_url VARCHAR(2048),
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_optimizations_image ON image_optimizations(image_id);

CREATE TABLE IF NOT EXISTS image_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL REFERENCES image_assets(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  total_bandwidth_bytes BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PREDICTIVE ANALYTICS & INSIGHTS
-- ============================================

CREATE TABLE IF NOT EXISTS content_performance_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  content_id UUID NOT NULL,
  content_type VARCHAR(50), -- article, product, page
  predicted_views INTEGER,
  predicted_engagement_rate NUMERIC(5, 4),
  predicted_conversion_rate NUMERIC(5, 4),
  confidence_score NUMERIC(3, 2),
  trend VARCHAR(50), -- up, stable, down
  trend_strength NUMERIC(3, 2),
  prediction_factors JSONB,
  predicted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  validation_actual_views INTEGER,
  validation_date TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_predictions_workspace ON content_performance_predictions(workspace_id);
CREATE INDEX idx_predictions_content ON content_performance_predictions(content_type);
CREATE INDEX idx_predictions_trend ON content_performance_predictions(trend);

CREATE TABLE IF NOT EXISTS trend_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  current_value NUMERIC,
  previous_value NUMERIC,
  change_percentage NUMERIC(6, 2),
  trend_direction VARCHAR(20), -- up, down, stable
  seasonality_pattern JSONB,
  anomalies JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  forecast_next_period NUMERIC
);

CREATE INDEX idx_trends_workspace ON trend_analysis(workspace_id);
CREATE INDEX idx_trends_metric ON trend_analysis(workspace_id, metric_name);

CREATE TABLE IF NOT EXISTS ml_model_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  model_type VARCHAR(50), -- classification, regression, clustering
  model_version VARCHAR(50),
  training_date TIMESTAMP WITH TIME ZONE,
  accuracy NUMERIC(5, 4),
  precision NUMERIC(5, 4),
  recall NUMERIC(5, 4),
  f1_score NUMERIC(5, 4),
  feature_importance JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, model_name, model_version)
);

CREATE INDEX idx_ml_models_workspace ON ml_model_metadata(workspace_id);

-- ============================================
-- ANALYTICS AND INSIGHTS VIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  event_name VARCHAR(100) NOT NULL,
  event_properties JSONB DEFAULT '{}'::jsonb,
  session_id VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_workspace ON analytics_events(workspace_id);
CREATE INDEX idx_events_event_name ON analytics_events(workspace_id, event_name);
CREATE INDEX idx_events_user ON analytics_events(workspace_id, user_id);
CREATE INDEX idx_events_timestamp ON analytics_events(timestamp DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE targeting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- A/B Tests: Analytics/Testing role access
CREATE POLICY ab_tests_select ON ab_tests FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM workspace_roles 
        WHERE 'manage_experiments' = ANY(permissions)
      )
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Audience Segments: Analytics role
CREATE POLICY segments_select ON audience_segments FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM workspace_roles 
        WHERE 'manage_audiences' = ANY(permissions)
      )
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Image Assets: Workspace members
CREATE POLICY images_select ON image_assets FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Analytics Events: Analytics role
CREATE POLICY events_select ON analytics_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM workspace_roles 
        WHERE 'view_analytics' = ANY(permissions)
      )
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS ab_test_summary AS
SELECT
  t.id,
  t.name,
  t.status,
  COUNT(DISTINCT a.user_id) as total_users,
  COUNT(DISTINCT v.id) as variant_count,
  MAX(t.updated_at) as last_updated
FROM ab_tests t
LEFT JOIN ab_test_assignments a ON t.id = a.test_id
LEFT JOIN ab_test_variants v ON t.id = v.test_id
GROUP BY t.id, t.name, t.status;

CREATE INDEX idx_ab_summary_id ON ab_test_summary(id);

CREATE MATERIALIZED VIEW IF NOT EXISTS audience_size_estimate AS
SELECT
  s.id,
  s.name,
  COUNT(DISTINCT sm.user_id) as actual_size,
  s.size_estimate,
  ROUND(COUNT(DISTINCT sm.user_id)::FLOAT / NULLIF(s.size_estimate, 0) * 100, 2) as accuracy_percentage
FROM audience_segments s
LEFT JOIN segment_memberships sm ON s.id = sm.segment_id
GROUP BY s.id, s.name, s.size_estimate;

CREATE INDEX idx_audience_size_id ON audience_size_estimate(id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION calculate_statistical_significance(
  variant_conversions INT,
  variant_total INT,
  control_conversions INT,
  control_total INT
) RETURNS NUMERIC AS $$
DECLARE
  variant_rate NUMERIC;
  control_rate NUMERIC;
  z_score NUMERIC;
BEGIN
  variant_rate := CASE WHEN variant_total > 0 THEN variant_conversions::NUMERIC / variant_total ELSE 0 END;
  control_rate := CASE WHEN control_total > 0 THEN control_conversions::NUMERIC / control_total ELSE 0 END;
  
  z_score := (variant_rate - control_rate) / SQRT(
    (variant_rate * (1 - variant_rate) / variant_total) +
    (control_rate * (1 - control_rate) / control_total)
  );
  
  RETURN LEAST(ABS(z_score), 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
