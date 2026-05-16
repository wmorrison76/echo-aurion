/**
 * UX Optimization Schema
 * Enables click reduction analysis, navigation optimization, and onboarding tracking
 */

-- =====================================================
-- USER TASK ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_task_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Task information
  task_name VARCHAR(255) NOT NULL,
  clicks INTEGER NOT NULL,
  duration NUMERIC NOT NULL, -- seconds
  
  -- Timestamp
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_task_analytics_user ON user_task_analytics(user_id);
CREATE INDEX idx_user_task_analytics_org ON user_task_analytics(org_id);
CREATE INDEX idx_user_task_analytics_task ON user_task_analytics(task_name);
CREATE INDEX idx_user_task_analytics_completed ON user_task_analytics(completed_at DESC);

-- =====================================================
-- NAVIGATION ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS navigation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Navigation information
  route_path TEXT NOT NULL,
  route_name VARCHAR(255) NOT NULL,
  navigation_depth INTEGER NOT NULL, -- How many clicks to reach
  bounced BOOLEAN DEFAULT FALSE, -- User left immediately
  
  -- Timestamp
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_navigation_analytics_user ON navigation_analytics(user_id);
CREATE INDEX idx_navigation_analytics_org ON navigation_analytics(org_id);
CREATE INDEX idx_navigation_analytics_route ON navigation_analytics(route_path);
CREATE INDEX idx_navigation_analytics_accessed ON navigation_analytics(accessed_at DESC);

-- =====================================================
-- ONBOARDING PROGRESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Progress information
  completed_steps TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  completion_percent NUMERIC NOT NULL DEFAULT 0, -- 0-100
  time_to_complete NUMERIC, -- minutes
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_org UNIQUE (user_id, org_id)
);

CREATE INDEX idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_org ON onboarding_progress(org_id);
CREATE INDEX idx_onboarding_progress_completion ON onboarding_progress(completion_percent);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_task_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY user_task_analytics_tenant_isolation ON user_task_analytics
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY navigation_analytics_tenant_isolation ON navigation_analytics
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY onboarding_progress_tenant_isolation ON onboarding_progress
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);
