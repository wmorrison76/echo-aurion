-- AI³ Seed Generator Analytics Schema
-- Comprehensive tracking of all AI³ generation phases

-- Session tracking table
CREATE TABLE IF NOT EXISTS ai3_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  session_type VARCHAR(50) NOT NULL,
  domain VARCHAR(100),
  detail_level VARCHAR(20) NOT NULL CHECK (detail_level IN ('concise', 'detailed', 'comprehensive')),
  initial_problem TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  session_duration_seconds INTEGER,
  conversation_turns INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation history
CREATE TABLE IF NOT EXISTS ai3_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  message_tokens INTEGER,
  response_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated code and artifacts
CREATE TABLE IF NOT EXISTS ai3_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  artifact_type VARCHAR(50) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(50),
  size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session ratings and feedback
CREATE TABLE IF NOT EXISTS ai3_session_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  code_quality_rating INTEGER CHECK (code_quality_rating >= 1 AND code_quality_rating <= 5),
  requirements_clarity_rating INTEGER CHECK (requirements_clarity_rating >= 1 AND requirements_clarity_rating <= 5),
  usefulness_rating INTEGER CHECK (usefulness_rating >= 1 AND usefulness_rating <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domain-specific analytics
CREATE TABLE IF NOT EXISTS ai3_domain_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(100) NOT NULL UNIQUE,
  total_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  avg_accuracy_rating DECIMAL(3, 2),
  avg_code_quality DECIMAL(3, 2),
  avg_requirements_clarity DECIMAL(3, 2),
  avg_usefulness DECIMAL(3, 2),
  completion_rate DECIMAL(5, 2),
  trending VARCHAR(20) CHECK (trending IN ('up', 'down', 'stable')),
  is_recommended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question effectiveness tracking
CREATE TABLE IF NOT EXISTS ai3_question_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  domain VARCHAR(100),
  detail_level VARCHAR(20),
  times_asked INTEGER DEFAULT 0,
  times_skipped INTEGER DEFAULT 0,
  times_helpful INTEGER DEFAULT 0,
  average_response_length INTEGER,
  effectiveness_score DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature suggestions tracking
CREATE TABLE IF NOT EXISTS ai3_feature_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  suggestion_text TEXT NOT NULL,
  was_accepted BOOLEAN,
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code quality metrics per session
CREATE TABLE IF NOT EXISTS ai3_code_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES ai3_artifacts(id) ON DELETE CASCADE,
  cyclomatic_complexity INTEGER,
  maintainability_index DECIMAL(5, 2),
  test_coverage DECIMAL(5, 2),
  security_score DECIMAL(5, 2),
  performance_score DECIMAL(5, 2),
  accessibility_score DECIMAL(5, 2),
  issues_count INTEGER,
  critical_issues INTEGER,
  warnings_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domain template learning
CREATE TABLE IF NOT EXISTS ai3_domain_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(100) NOT NULL,
  template_key VARCHAR(255) NOT NULL UNIQUE,
  template_content JSONB NOT NULL,
  success_count INTEGER DEFAULT 0,
  avg_effectiveness DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS ai3_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferred_detail_level VARCHAR(20) DEFAULT 'detailed',
  preferred_domain VARCHAR(100),
  preferred_frameworks JSONB,
  preferred_languages JSONB,
  expertise_level VARCHAR(20) CHECK (expertise_level IN ('beginner', 'intermediate', 'advanced')),
  notification_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance analytics
CREATE TABLE IF NOT EXISTS ai3_performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  phase VARCHAR(50) NOT NULL,
  phase_duration_seconds INTEGER,
  api_calls_count INTEGER,
  total_tokens_used INTEGER,
  cost_estimate DECIMAL(10, 4),
  errors_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration tracking
CREATE TABLE IF NOT EXISTS ai3_integration_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  integration_name VARCHAR(255) NOT NULL,
  was_suggested BOOLEAN DEFAULT TRUE,
  was_selected BOOLEAN DEFAULT FALSE,
  implementation_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session snapshots for versioning
CREATE TABLE IF NOT EXISTS ai3_session_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  snapshot_number INTEGER NOT NULL,
  snapshot_name VARCHAR(255),
  snapshot_data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared sessions and collaboration
CREATE TABLE IF NOT EXISTS ai3_shared_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('view', 'comment', 'edit')),
  shared_with_email VARCHAR(255),
  shared_with_user_id UUID,
  is_public BOOLEAN DEFAULT FALSE,
  access_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task exports (Jira, Linear, etc)
CREATE TABLE IF NOT EXISTS ai3_task_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai3_sessions(id) ON DELETE CASCADE,
  exported_by UUID NOT NULL,
  export_platform VARCHAR(50) NOT NULL CHECK (export_platform IN ('jira', 'linear', 'github', 'asana')),
  external_id VARCHAR(255),
  external_url VARCHAR(500),
  export_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai3_sessions_user_id ON ai3_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai3_sessions_created_at ON ai3_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai3_sessions_status ON ai3_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai3_sessions_domain ON ai3_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_ai3_conversations_session_id ON ai3_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai3_artifacts_session_id ON ai3_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_ai3_domain_analytics_domain ON ai3_domain_analytics(domain);
CREATE INDEX IF NOT EXISTS idx_ai3_shared_sessions_share_token ON ai3_shared_sessions(share_token);
CREATE INDEX IF NOT EXISTS idx_ai3_task_exports_session_id ON ai3_task_exports(session_id);
CREATE INDEX IF NOT EXISTS idx_ai3_question_analytics_domain ON ai3_question_analytics(domain);

-- RLS Policies
ALTER TABLE ai3_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_session_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_domain_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_question_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_feature_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_code_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_domain_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_integration_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_session_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_shared_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai3_task_exports ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own sessions
CREATE POLICY "Users can view their own sessions" ON ai3_sessions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can insert their own sessions" ON ai3_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their session conversations" ON ai3_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai3_sessions WHERE id = session_id AND (auth.uid() = user_id OR auth.uid() = created_by)
    )
  );

CREATE POLICY "Users can view shared sessions" ON ai3_shared_sessions
  FOR SELECT USING (
    auth.uid() = shared_by OR 
    auth.uid() = shared_with_user_id OR 
    is_public = TRUE OR
    shared_with_email = auth.jwt() ->> 'email'
  );

-- Analytics are readable by all authenticated users
CREATE POLICY "Analytics are readable" ON ai3_domain_analytics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Question analytics are readable" ON ai3_question_analytics
  FOR SELECT USING (auth.role() = 'authenticated');
