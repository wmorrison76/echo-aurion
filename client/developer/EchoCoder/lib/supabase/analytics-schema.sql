-- AI Seed Generator Analytics Schema

-- Track each seed generation session
CREATE TABLE IF NOT EXISTS seed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT,
  detail_level TEXT NOT NULL, -- 'concise', 'detailed', 'comprehensive'
  initial_problem TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'in_progress', -- 'completed', 'abandoned'
  session_duration_seconds INT,
  conversation_turns INT DEFAULT 0,
  accuracy_rating INT, -- 1-5 stars
  rating_comments TEXT,
  generated_code_quality INT, -- 1-5 stars
  requirements_doc_quality INT, -- 1-5 stars
  usefulness_rating INT, -- 1-5 stars
  INDEX (user_id),
  INDEX (domain),
  INDEX (created_at),
  INDEX (status)
);

-- Store individual conversation messages
CREATE TABLE IF NOT EXISTS seed_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES seed_sessions(id) ON DELETE CASCADE,
  message_order INT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'ai'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  INDEX (session_id),
  INDEX (message_order)
);

-- Track domains and their effectiveness
CREATE TABLE IF NOT EXISTS domain_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  total_sessions INT DEFAULT 0,
  avg_accuracy_rating DECIMAL(3,2),
  avg_code_quality DECIMAL(3,2),
  avg_requirements_quality DECIMAL(3,2),
  avg_usefulness DECIMAL(3,2),
  completion_rate DECIMAL(5,2), -- percentage
  avg_conversation_turns INT,
  avg_duration_seconds INT,
  last_updated TIMESTAMP DEFAULT now(),
  INDEX (domain),
  INDEX (avg_accuracy_rating DESC)
);

-- Track question effectiveness
CREATE TABLE IF NOT EXISTS question_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  detail_level TEXT NOT NULL,
  domain TEXT,
  times_asked INT DEFAULT 0,
  avg_accuracy_impact DECIMAL(3,2),
  avg_relevance_score INT,
  skip_rate DECIMAL(5,2),
  position_in_sequence INT,
  effectiveness_score DECIMAL(3,2),
  last_updated TIMESTAMP DEFAULT now(),
  INDEX (domain),
  INDEX (detail_level),
  INDEX (effectiveness_score DESC)
);

-- Track generated features and their usage
CREATE TABLE IF NOT EXISTS feature_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES seed_sessions(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  category TEXT NOT NULL, -- 'core', 'recommended', 'advanced'
  accepted_by_user BOOLEAN,
  implemented BOOLEAN,
  created_at TIMESTAMP DEFAULT now(),
  INDEX (session_id),
  INDEX (feature),
  INDEX (created_at)
);

-- Track recommended architectures and their success
CREATE TABLE IF NOT EXISTS architecture_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES seed_sessions(id) ON DELETE CASCADE,
  architecture_type TEXT NOT NULL, -- 'microservices', 'monolith', 'serverless', etc
  recommended_reason TEXT,
  user_accepted BOOLEAN,
  success_outcome INT, -- 1-5 rating
  created_at TIMESTAMP DEFAULT now(),
  INDEX (session_id),
  INDEX (architecture_type)
);

-- Track code quality metrics of generated modules
CREATE TABLE IF NOT EXISTS code_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES seed_sessions(id) ON DELETE CASCADE,
  cyclomatic_complexity INT,
  lines_of_code INT,
  test_coverage_percentage DECIMAL(5,2),
  accessibility_score INT, -- 1-100
  performance_score INT, -- 1-100
  security_issues_count INT,
  lint_warnings_count INT,
  created_at TIMESTAMP DEFAULT now(),
  INDEX (session_id),
  INDEX (test_coverage_percentage)
);

-- Track user patterns and preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  preferred_detail_level TEXT,
  preferred_domains TEXT[], -- array of domains
  preferred_frameworks TEXT[], -- React, Vue, Angular, etc
  preferred_databases TEXT[], -- Supabase, MongoDB, PostgreSQL, etc
  avg_session_time_seconds INT,
  total_sessions INT DEFAULT 0,
  total_modules_generated INT DEFAULT 0,
  last_session TIMESTAMP,
  expertise_level TEXT, -- 'beginner', 'intermediate', 'expert'
  updated_at TIMESTAMP DEFAULT now(),
  INDEX (user_id)
);

-- Track integration requests and suggestions
CREATE TABLE IF NOT EXISTS integration_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES seed_sessions(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'stripe', 'auth0', 'zapier', 'supabase', etc
  suggested BOOLEAN,
  implemented BOOLEAN,
  success_outcome INT, -- 1-5 rating
  created_at TIMESTAMP DEFAULT now(),
  INDEX (session_id),
  INDEX (integration_type)
);

-- Track performance metrics
CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES seed_sessions(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL, -- 'interview', 'generation', 'integration'
  phase_duration_ms INT,
  tokens_used INT,
  api_calls_made INT,
  errors_encountered INT,
  created_at TIMESTAMP DEFAULT now(),
  INDEX (session_id),
  INDEX (phase_name)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_seed_sessions_accuracy ON seed_sessions(accuracy_rating DESC);
CREATE INDEX IF NOT EXISTS idx_seed_sessions_domain_rating ON seed_sessions(domain, accuracy_rating DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session_order ON seed_conversations(session_id, message_order);
