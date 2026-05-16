-- Analytics Tables for LUCCCA Framework

-- Module Usage Tracking
CREATE TABLE module_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- 'open', 'close', 'generate', 'deploy'
  timestamp TIMESTAMP DEFAULT NOW(),
  duration_ms INT,
  status VARCHAR(50), -- 'success', 'error', 'pending'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_module_analytics_module ON module_analytics(module_name);
CREATE INDEX idx_module_analytics_timestamp ON module_analytics(timestamp);
CREATE INDEX idx_module_analytics_user ON module_analytics(user_id);

-- Code Generation Analytics
CREATE TABLE code_generation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  description TEXT,
  generated_code_lines INT,
  generation_time_ms INT,
  success BOOLEAN,
  error_message TEXT,
  model_used VARCHAR(100), -- 'gpt-4', 'gpt-3.5-turbo', etc
  tokens_used INT,
  cost_usd DECIMAL(10, 4),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_code_gen_module ON code_generation_analytics(module_name);
CREATE INDEX idx_code_gen_timestamp ON code_generation_analytics(timestamp);

-- Performance Metrics
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(255) NOT NULL,
  metric_type VARCHAR(100), -- 'render_time', 'load_time', 'memory', 'cpu'
  value DECIMAL(10, 2),
  unit VARCHAR(50), -- 'ms', 'kb', '%'
  browser VARCHAR(100),
  device_type VARCHAR(50), -- 'desktop', 'tablet', 'mobile'
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_perf_module ON performance_metrics(module_name);
CREATE INDEX idx_perf_type ON performance_metrics(metric_type);
CREATE INDEX idx_perf_timestamp ON performance_metrics(timestamp);

-- Error Tracking (Sentry Integration)
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentry_event_id VARCHAR(255),
  module_name VARCHAR(255),
  error_message TEXT,
  error_type VARCHAR(255),
  stack_trace TEXT,
  user_id VARCHAR(255),
  browser_info JSONB,
  request_url TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_errors_module ON error_logs(module_name);
CREATE INDEX idx_errors_timestamp ON error_logs(timestamp);
CREATE INDEX idx_errors_resolved ON error_logs(resolved);

-- Webhook Events
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100), -- 'module.created', 'code.generated', 'error.occurred'
  payload JSONB,
  status VARCHAR(50), -- 'pending', 'sent', 'failed'
  retry_count INT DEFAULT 0,
  next_retry_at TIMESTAMP,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhooks_type ON webhook_events(event_type);
CREATE INDEX idx_webhooks_status ON webhook_events(status);

-- Git Integration Data
CREATE TABLE git_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_name VARCHAR(255) NOT NULL,
  commit_hash VARCHAR(255) UNIQUE NOT NULL,
  author VARCHAR(255),
  message TEXT,
  files_changed INT,
  insertions INT,
  deletions INT,
  timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_commits_repo ON git_commits(repo_name);
CREATE INDEX idx_commits_timestamp ON git_commits(timestamp);

-- GitHub Pull Requests
CREATE TABLE github_pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_name VARCHAR(255) NOT NULL,
  pr_number INT,
  title VARCHAR(500),
  description TEXT,
  author VARCHAR(255),
  status VARCHAR(50), -- 'open', 'merged', 'closed'
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  merged_at TIMESTAMP,
  files_changed INT,
  additions INT,
  deletions INT,
  database_created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prs_repo ON github_pull_requests(repo_name);
CREATE INDEX idx_prs_status ON github_pull_requests(status);

-- Module Dependencies
CREATE TABLE module_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module VARCHAR(255) NOT NULL,
  target_module VARCHAR(255) NOT NULL,
  dependency_type VARCHAR(50), -- 'import', 'hook', 'component'
  weight INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_module, target_module)
);

CREATE INDEX idx_deps_source ON module_dependencies(source_module);
CREATE INDEX idx_deps_target ON module_dependencies(target_module);

-- Test Coverage
CREATE TABLE test_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(100), -- 'unit', 'integration', 'e2e'
  coverage_percent DECIMAL(5, 2),
  total_tests INT,
  passing_tests INT,
  failing_tests INT,
  skipped_tests INT,
  execution_time_ms INT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tests_module ON test_coverage(module_name);
CREATE INDEX idx_tests_timestamp ON test_coverage(timestamp);

-- User Sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  modules_accessed TEXT[], -- array of module names
  actions_count INT,
  code_generated INT,
  duration_minutes INT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_start ON user_sessions(session_start);

-- Analytics Summary (for predictions)
CREATE TABLE analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  total_modules_used INT,
  total_code_generated_lines INT,
  total_errors INT,
  average_generation_time_ms INT,
  total_users INT,
  most_used_module VARCHAR(255),
  average_session_duration_minutes INT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(metric_date)
);

CREATE INDEX idx_summary_date ON analytics_summary(metric_date);
