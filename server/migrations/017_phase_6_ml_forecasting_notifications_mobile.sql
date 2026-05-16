-- Migration: Phase 6 - ML Labor Forecasting, Notification System, Mobile Time Tracking
-- Purpose: Implement machine learning predictions, automated scheduling, and mobile-optimized time tracking
-- Date: 2025-01-15
-- Features: ML labor forecasting, automated staff assignment, multi-channel notifications, mobile task-specific time tracking

-- =====================================================
-- ML LABOR FORECASTING TABLES
-- =====================================================

-- Store ML model versions and training metadata
CREATE TABLE IF NOT EXISTS ml_labor_forecast_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Model metadata
  model_name VARCHAR(255) NOT NULL, -- e.g., 'labor_forecast_v1', 'event_type_labor_v2'
  model_version INTEGER NOT NULL,
  model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('linear_regression', 'neural_network', 'xgboost', 'ensemble')),
  
  -- Target variable
  target_metric VARCHAR(100) NOT NULL, -- e.g., 'estimated_hours', 'labor_cost', 'staff_count'
  
  -- Training data statistics
  training_samples_count INTEGER,
  last_trained_date TIMESTAMP WITH TIME ZONE,
  accuracy_score NUMERIC(5,3), -- R² for regression, typically 0-1
  mean_absolute_error NUMERIC(10,2), -- MAE for actual vs predicted
  
  -- Model parameters (stored as JSON for flexibility)
  model_parameters JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  deployment_date TIMESTAMP WITH TIME ZONE,
  deprecation_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, model_name, model_version)
);

CREATE INDEX IF NOT EXISTS idx_ml_models_org_active ON ml_labor_forecast_models(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ml_models_trained ON ml_labor_forecast_models(last_trained_date DESC);

-- Store individual labor forecasts (predictions for upcoming events)
CREATE TABLE IF NOT EXISTS labor_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Forecast context
  event_id UUID NOT NULL,
  production_task_id UUID,
  department_id UUID,
  
  -- Forecast input features
  guest_count INTEGER NOT NULL,
  event_type VARCHAR(100),
  plating_type VARCHAR(50),
  prep_days INTEGER DEFAULT 1,
  event_duration_hours NUMERIC(5,2),
  guest_complexity_score NUMERIC(5,2), -- 0-10 complexity
  venue_size VARCHAR(50), -- small, medium, large
  
  -- ML predictions
  predicted_labor_hours NUMERIC(10,2),
  predicted_staff_count INTEGER,
  predicted_labor_cost NUMERIC(12,2),
  prediction_confidence NUMERIC(5,3), -- 0-1, higher is more confident
  
  -- Confidence intervals
  lower_bound_hours NUMERIC(10,2), -- 95% confidence
  upper_bound_hours NUMERIC(10,2),
  lower_bound_cost NUMERIC(12,2),
  upper_bound_cost NUMERIC(12,2),
  
  -- Breakdown by department (if multi-department event)
  department_breakdown JSONB, -- { "banquet": { hours: 20, cost: 500 }, "pastry": { hours: 8, cost: 150 } }
  
  -- Comparison to actuals (if event completed)
  actual_hours NUMERIC(10,2),
  actual_cost NUMERIC(12,2),
  forecast_accuracy_percentage NUMERIC(5,2), -- How close was the prediction
  
  -- Model used for this prediction
  ml_model_id UUID,
  
  -- Status
  forecast_status VARCHAR(50) DEFAULT 'pending' CHECK (forecast_status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (ml_model_id) REFERENCES ml_labor_forecast_models(id) ON DELETE SET NULL,
  
  UNIQUE(event_id, department_id, ml_model_id)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_event ON labor_forecasts(event_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_dept ON labor_forecasts(department_id, forecast_status);
CREATE INDEX IF NOT EXISTS idx_forecasts_model ON labor_forecasts(ml_model_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_confidence ON labor_forecasts(prediction_confidence DESC);

-- Training dataset for ML model improvement
CREATE TABLE IF NOT EXISTS ml_training_dataset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Input features from historical events
  guest_count INTEGER NOT NULL,
  event_type VARCHAR(100),
  plating_type VARCHAR(50),
  prep_days INTEGER,
  event_duration_hours NUMERIC(5,2),
  guest_complexity_score NUMERIC(5,2),
  venue_size VARCHAR(50),
  
  -- Target variable (actual outcome)
  actual_labor_hours NUMERIC(10,2) NOT NULL,
  actual_staff_count INTEGER,
  actual_labor_cost NUMERIC(12,2),
  
  -- Additional context
  seasonal_quarter VARCHAR(2), -- Q1, Q2, Q3, Q4
  is_holiday_event BOOLEAN DEFAULT FALSE,
  is_weekend_event BOOLEAN DEFAULT FALSE,
  weather_conditions VARCHAR(100),
  
  -- Data quality flags
  data_quality_score NUMERIC(5,3), -- 0-1, how reliable is this data point
  is_outlier BOOLEAN DEFAULT FALSE, -- Flag unusual events for exclusion if needed
  
  created_from_event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_from_event_id) REFERENCES calendar_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_training_data_org ON ml_training_dataset(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_data_quality ON ml_training_dataset(data_quality_score DESC);

-- =====================================================
-- AUTOMATED SCHEDULING TABLES
-- =====================================================

-- Track automated scheduling suggestions and their acceptance
CREATE TABLE IF NOT EXISTS auto_schedule_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Context
  production_task_id UUID NOT NULL,
  suggested_by_system VARCHAR(100), -- e.g., 'auto_scheduler_v1', 'ml_optimizer'
  
  -- Suggested staff assignments (array of staff with details)
  suggested_assignments JSONB NOT NULL, -- [{ employee_id, role, estimated_hours, confidence }]
  
  -- Scheduling algorithm details
  algorithm_used VARCHAR(100), -- e.g., 'skill_matching', 'availability_first', 'cost_optimized'
  optimization_criteria VARCHAR(100), -- e.g., 'minimize_cost', 'maximize_quality', 'balanced'
  
  -- Quality metrics
  solution_quality_score NUMERIC(5,3), -- 0-1, how good is this schedule
  skill_match_percentage NUMERIC(5,2), -- 0-100, avg skill match for assignments
  coverage_percentage NUMERIC(5,2), -- 0-100, how much of needed hours covered
  estimated_total_cost NUMERIC(12,2),
  
  -- Human review
  reviewed_by_user_id UUID,
  acceptance_status VARCHAR(50) DEFAULT 'pending' CHECK (acceptance_status IN (
    'pending',      -- Awaiting human review
    'accepted',     -- Manager approved and applied
    'rejected',     -- Manager rejected
    'partially_accepted', -- Some suggestions used, some ignored
    'expired'       -- Suggestion became outdated (event happened or cancelled)
  )),
  acceptance_notes TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_suggestions_task ON auto_schedule_suggestions(production_task_id, acceptance_status);
CREATE INDEX IF NOT EXISTS idx_auto_suggestions_quality ON auto_schedule_suggestions(solution_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_auto_suggestions_created ON auto_schedule_suggestions(created_at DESC);

-- Track optimization feedback to improve future suggestions
CREATE TABLE IF NOT EXISTS auto_schedule_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Reference to suggestion
  suggestion_id UUID NOT NULL,
  production_task_id UUID NOT NULL,
  
  -- Actual outcome vs prediction
  predicted_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  cost_variance_percentage NUMERIC(6,2),
  
  predicted_quality_score NUMERIC(5,3),
  actual_quality_score NUMERIC(5,3),
  
  -- Feedback
  manager_satisfaction NUMERIC(2,1), -- 1-5 rating
  quality_notes TEXT,
  cost_efficiency_notes TEXT,
  improvement_suggestions TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (suggestion_id) REFERENCES auto_schedule_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_feedback_suggestion ON auto_schedule_feedback(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_auto_feedback_satisfaction ON auto_schedule_feedback(manager_satisfaction);

-- =====================================================
-- NOTIFICATION SYSTEM TABLES
-- =====================================================

-- Staff notification preferences
CREATE TABLE IF NOT EXISTS staff_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Communication channels
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  slack_enabled BOOLEAN DEFAULT FALSE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  
  -- Phone number for SMS
  phone_number VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Slack workspace and user ID
  slack_workspace_id VARCHAR(255),
  slack_user_id VARCHAR(255),
  slack_verified BOOLEAN DEFAULT FALSE,
  slack_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Notification frequency preferences
  notification_frequency VARCHAR(50) DEFAULT 'immediate' CHECK (notification_frequency IN (
    'immediate',      -- Send right away
    'daily_digest',   -- Daily summary
    'weekly_digest',  -- Weekly summary
    'none'            -- Disable all
  )),
  
  -- Do not disturb window
  do_not_disturb_enabled BOOLEAN DEFAULT FALSE,
  do_not_disturb_start_time TIME,
  do_not_disturb_end_time TIME,
  
  -- Notification types to subscribe to
  notify_on_assignment BOOLEAN DEFAULT TRUE,
  notify_on_schedule_change BOOLEAN DEFAULT TRUE,
  notify_on_reminder BOOLEAN DEFAULT TRUE,
  notify_on_feedback BOOLEAN DEFAULT TRUE,
  notify_on_performance_update BOOLEAN DEFAULT TRUE,
  notify_on_emergency BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  UNIQUE(org_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_employee ON staff_notification_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_slack ON staff_notification_preferences(slack_user_id)
  WHERE slack_enabled = TRUE;

-- Notification queue and delivery tracking
CREATE TABLE IF NOT EXISTS staff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  recipient_employee_id UUID NOT NULL,
  
  -- Notification content
  notification_type VARCHAR(100) NOT NULL, -- e.g., 'task_assigned', 'schedule_reminder', 'performance_feedback'
  title VARCHAR(255),
  message TEXT NOT NULL,
  action_url VARCHAR(500), -- Link to take action on notification
  
  -- Reference to related entity
  related_production_task_id UUID,
  related_event_id UUID,
  
  -- Delivery channels used
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  slack_sent BOOLEAN DEFAULT FALSE,
  slack_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery status
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN (
    'pending',
    'sent',
    'failed',
    'bounced',
    'read'
  )),
  
  -- Attempt tracking
  delivery_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_error_message TEXT,
  
  -- Recipient interaction
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (related_event_id) REFERENCES calendar_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON staff_notifications(recipient_employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON staff_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON staff_notifications(recipient_employee_id, read_at)
  WHERE read_at IS NULL;

-- Notification history and audit log
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  
  -- Delivery attempt details
  channel VARCHAR(50) NOT NULL, -- email, sms, slack, in_app
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Delivery result
  success BOOLEAN,
  response_code VARCHAR(10),
  response_message TEXT,
  
  -- Provider information
  provider_id VARCHAR(255), -- Message ID from provider (e.g., SendGrid, Twilio)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES staff_notifications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_channel ON notification_delivery_log(channel, sent_at DESC);

-- =====================================================
-- MOBILE TIME TRACKING TABLES
-- =====================================================

-- Task-specific time tracking for mobile
CREATE TABLE IF NOT EXISTS task_time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Context
  staff_assignment_id UUID NOT NULL,
  production_task_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Clock in/out events
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_in_location VARCHAR(255), -- GPS or manual location entry
  clock_in_device_id VARCHAR(255), -- Mobile device identifier
  
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_out_location VARCHAR(255),
  clock_out_device_id VARCHAR(255),
  
  -- Break tracking (for long shifts)
  break_start_time TIMESTAMP WITH TIME ZONE,
  break_end_time TIMESTAMP WITH TIME ZONE,
  break_duration_minutes INTEGER,
  
  -- Actual duration calculation
  total_minutes_worked INTEGER, -- Calculated: (clock_out - clock_in) - break_duration
  total_hours_worked NUMERIC(10,2), -- total_minutes_worked / 60
  
  -- Quality and notes
  work_quality_notes TEXT,
  task_completion_percentage NUMERIC(5,2), -- 0-100
  
  -- Status
  is_submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by_user_id UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_assignment_id) REFERENCES staff_task_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(staff_assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_time_tracking_employee ON task_time_tracking(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_tracking_task ON task_time_tracking(production_task_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_submitted ON task_time_tracking(is_submitted, approved_at);

-- Time tracking edits and corrections
CREATE TABLE IF NOT EXISTS time_tracking_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  time_tracking_id UUID NOT NULL,
  
  -- Adjustment details
  adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN (
    'clock_time_correction',     -- Corrected clock in/out time
    'break_adjustment',          -- Adjusted break time
    'manual_hours_entry',        -- Manual hour entry for non-mobile tracking
    'retroactive_approval'       -- Supervisor approval of previously submitted
  )),
  
  -- Original vs new values
  original_value VARCHAR(255),
  new_value VARCHAR(255),
  reason_for_adjustment TEXT,
  
  -- Who made the adjustment
  adjusted_by_user_id UUID NOT NULL,
  adjusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (time_tracking_id) REFERENCES task_time_tracking(id) ON DELETE CASCADE,
  FOREIGN KEY (adjusted_by_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_adjustments_tracking ON time_tracking_adjustments(time_tracking_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_user ON time_tracking_adjustments(adjusted_by_user_id);

-- =====================================================
-- ALTER EXISTING TABLES
-- =====================================================

-- Add ML and notification columns to maestro_production_tasks
ALTER TABLE maestro_production_tasks
ADD COLUMN IF NOT EXISTS has_ml_forecast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_scheduling_applied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mobile_time_tracking_enabled BOOLEAN DEFAULT TRUE;

-- Add notification log reference to staff_task_assignments
ALTER TABLE staff_task_assignments
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assignment_notification_id UUID;

-- =====================================================
-- HELPER FUNCTIONS FOR PHASE 6
-- =====================================================

-- Calculate average labor hours for event type and guest count (for ML features)
CREATE OR REPLACE FUNCTION get_avg_labor_hours_for_event(
  p_event_type VARCHAR,
  p_guest_count INTEGER,
  p_plating_type VARCHAR,
  p_org_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_avg_hours NUMERIC(10,2);
BEGIN
  SELECT COALESCE(AVG(actual_hours_worked), 0)::NUMERIC
  INTO v_avg_hours
  FROM labor_performance_analytics
  WHERE org_id = p_org_id
    AND event_type = p_event_type
    AND plating_type = p_plating_type
    AND guest_count BETWEEN (p_guest_count - 20) AND (p_guest_count + 20)
    AND actual_hours_worked IS NOT NULL
    AND created_at > NOW() - INTERVAL '90 days';
  
  RETURN v_avg_hours;
END;
$$ LANGUAGE plpgsql;

-- Get available staff for auto-scheduling (considering skills and availability)
CREATE OR REPLACE FUNCTION get_available_staff_for_auto_schedule(
  p_production_task_id UUID,
  p_required_skill VARCHAR(100),
  p_min_proficiency VARCHAR(20),
  p_org_id UUID
) RETURNS TABLE (
  employee_id UUID,
  employee_name VARCHAR,
  skill_proficiency VARCHAR,
  skill_match_score NUMERIC,
  availability_score NUMERIC,
  total_match_score NUMERIC
) AS $$
DECLARE
  v_required_count CONSTANT INTEGER := 1;
  v_min_prof_level CONSTANT VARCHAR := p_min_proficiency;
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    COALESCE(u.user_metadata ->> 'full_name', u.email)::VARCHAR,
    ss.proficiency_level::VARCHAR,
    CASE 
      WHEN ss.proficiency_level = 'expert' THEN 100
      WHEN ss.proficiency_level = 'advanced' THEN 85
      WHEN ss.proficiency_level = 'intermediate' THEN 70
      WHEN ss.proficiency_level = 'beginner' THEN 50
      ELSE 30
    END::NUMERIC as skill_match,
    CASE 
      WHEN sac.constraint_type IS NULL THEN 100
      ELSE 50
    END::NUMERIC as availability,
    (CASE 
      WHEN ss.proficiency_level = 'expert' THEN 100
      WHEN ss.proficiency_level = 'advanced' THEN 85
      WHEN ss.proficiency_level = 'intermediate' THEN 70
      WHEN ss.proficiency_level = 'beginner' THEN 50
      ELSE 30
    END * 0.7 + CASE 
      WHEN sac.constraint_type IS NULL THEN 100
      ELSE 50
    END * 0.3)::NUMERIC as total_score
  FROM auth.users u
  LEFT JOIN staff_skills ss ON u.id = ss.employee_id 
    AND ss.skill_code = p_required_skill
    AND ss.org_id = p_org_id
  LEFT JOIN staff_availability_constraints sac ON u.id = sac.employee_id 
    AND sac.org_id = p_org_id
    AND sac.is_active = TRUE
  WHERE ss.proficiency_level IN (p_min_proficiency, 'advanced', 'expert')
    OR (ss.proficiency_level IS NULL AND p_min_proficiency = 'beginner')
  ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Estimate labor cost using ML prediction and historical data
CREATE OR REPLACE FUNCTION estimate_labor_cost_ml(
  p_guest_count INTEGER,
  p_event_type VARCHAR,
  p_plating_type VARCHAR,
  p_prep_days INTEGER,
  p_org_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_base_hours NUMERIC(10,2);
  v_estimated_cost NUMERIC(12,2);
  v_multiplier NUMERIC(3,2);
BEGIN
  -- Get base hours from historical average
  v_base_hours := get_avg_labor_hours_for_event(p_event_type, p_guest_count, p_plating_type, p_org_id);
  
  -- If no historical data, use simple calculation
  IF v_base_hours = 0 THEN
    v_base_hours := (p_guest_count::NUMERIC / 50) * 4;
  END IF;
  
  -- Apply multipliers
  v_multiplier := CASE p_plating_type
    WHEN 'buffet' THEN 0.8
    WHEN 'plated' THEN 1.0
    WHEN 'family_style' THEN 0.9
    ELSE 1.0
  END;
  
  v_base_hours := v_base_hours * v_multiplier;
  
  -- Prep day multiplier
  IF p_prep_days > 1 THEN
    v_base_hours := v_base_hours * (1 + (p_prep_days - 1) * 0.15);
  END IF;
  
  -- Estimate cost at $30/hour average
  v_estimated_cost := v_base_hours * 30;
  
  RETURN v_estimated_cost;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ml_labor_forecast_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_dataset ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_schedule_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_schedule_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_tracking_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ml_models_view_policy ON ml_labor_forecast_models
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY forecasts_view_policy ON labor_forecasts
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY training_data_view_policy ON ml_training_dataset
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY auto_suggestions_view_policy ON auto_schedule_suggestions
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY notifications_view_policy ON staff_notifications
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    OR recipient_employee_id = auth.uid()
  );

CREATE POLICY time_tracking_view_policy ON task_time_tracking
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    OR employee_id = auth.uid()
  );

-- =====================================================
-- TRIGGERS FOR PHASE 6
-- =====================================================

CREATE OR REPLACE FUNCTION update_phase6_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ml_models_timestamp
BEFORE UPDATE ON ml_labor_forecast_models
FOR EACH ROW
EXECUTE FUNCTION update_phase6_timestamp();

CREATE TRIGGER trigger_update_forecasts_timestamp
BEFORE UPDATE ON labor_forecasts
FOR EACH ROW
EXECUTE FUNCTION update_phase6_timestamp();

CREATE TRIGGER trigger_update_auto_suggestions_timestamp
BEFORE UPDATE ON auto_schedule_suggestions
FOR EACH ROW
EXECUTE FUNCTION update_phase6_timestamp();

CREATE TRIGGER trigger_update_notif_prefs_timestamp
BEFORE UPDATE ON staff_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_phase6_timestamp();

CREATE TRIGGER trigger_update_time_tracking_timestamp
BEFORE UPDATE ON task_time_tracking
FOR EACH ROW
EXECUTE FUNCTION update_phase6_timestamp();

COMMIT;
