-- EchoAI Master Knowledge System Schema
-- Stores LUCCCA module index, file references, PDF embeddings, and RAG knowledge base

-- 1. LUCCCA Module Index Table
CREATE TABLE IF NOT EXISTS echo_luccca_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL UNIQUE,
  module_path TEXT NOT NULL,
  module_type TEXT NOT NULL, -- 'service', 'component', 'page', 'utility', 'hook'
  description TEXT,
  primary_function TEXT, -- Main purpose in plain English
  dependencies TEXT[], -- Array of module dependencies
  exports TEXT[], -- Array of exported functions/components
  lines_of_code INT,
  last_scanned TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. LUCCCA File Index Table
CREATE TABLE IF NOT EXISTS echo_luccca_file_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL, -- 'ts', 'tsx', 'sql', 'json', 'md'
  file_size INT,
  module_id UUID REFERENCES echo_luccca_modules(id) ON DELETE SET NULL,
  content_hash TEXT, -- For change detection
  is_indexed BOOLEAN DEFAULT false,
  last_indexed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Knowledge Base Embeddings (Vector Storage)
CREATE TABLE IF NOT EXISTS echo_knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'code', 'documentation', 'schema', 'api_endpoint', 'business_logic'
  source_id UUID, -- Links to module, file, or PDF
  source_name TEXT NOT NULL, -- 'UserService', 'reservation-flow.ts', etc
  section_title TEXT, -- For breaking large docs into sections
  content_text TEXT NOT NULL, -- The actual text/code being embedded
  embedding vector(1536), -- OpenAI embeddings (1536 dimensions)
  metadata JSONB, -- {module, line_range, confidence, importance, updated_date}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS echo_embedding_search ON echo_knowledge_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 4. Pure Knowledge Base (Anonymous, categorized knowledge extracted from PDFs)
CREATE TABLE IF NOT EXISTS echo_pure_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id TEXT NOT NULL UNIQUE, -- Anonymous identifier (e.g., 'knowledge-001')
  category TEXT NOT NULL, -- e.g., 'culinary', 'hospitality', 'financial', 'operations'
  subcategory TEXT, -- More specific category
  knowledge_type TEXT NOT NULL, -- 'concept', 'procedure', 'recipe', 'rule', 'technique', 'insight'
  title TEXT NOT NULL, -- Short title of this knowledge
  summary TEXT NOT NULL, -- AI-generated concise summary
  key_concepts TEXT[], -- Main topics/concepts
  created_from_source TEXT, -- 'pdf', 'conversation', 'observation', 'feedback'
  source_hash TEXT, -- Hash of original content for deduplication (without storing source)
  confidence_score FLOAT DEFAULT 0.85, -- 0-1, how confident this knowledge is
  usage_count INT DEFAULT 0, -- How many times this knowledge has been used
  last_accessed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_category ON echo_pure_knowledge(category);
CREATE INDEX IF NOT EXISTS knowledge_type ON echo_pure_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS knowledge_confidence ON echo_pure_knowledge(confidence_score DESC);

-- 5. Knowledge Chunks & Embeddings (Pure knowledge broken into searchable chunks)
CREATE TABLE IF NOT EXISTS echo_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES echo_pure_knowledge(id) ON DELETE CASCADE,
  chunk_number INT NOT NULL,
  chunk_text TEXT NOT NULL, -- The actual knowledge content
  chunk_type TEXT, -- 'definition', 'instruction', 'example', 'warning', 'tip'
  embedding vector(1536), -- Vector embedding for semantic search
  importance_score FLOAT DEFAULT 0.5, -- 0-1, how important this chunk is
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_chunk_search ON echo_knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 6. AI Decision & Forecast Tracking (10-day forecasting, 2-day decision window)
CREATE TABLE IF NOT EXISTS echo_ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT NOT NULL UNIQUE, -- Anonymous identifier
  decision_category TEXT NOT NULL, -- e.g., 'forecast', 'operation', 'resource_allocation'
  decision_context JSONB NOT NULL, -- Full context of decision
  forecast_days_ahead INT DEFAULT 10, -- How far ahead this decision forecasts
  decision_made_at TIMESTAMP NOT NULL,
  decision_effective_date TIMESTAMP, -- When decision takes effect (typically 2 days later)
  forecasted_outcome TEXT, -- What we predicted would happen
  actual_outcome TEXT, -- What actually happened (filled in after evaluation)
  confidence_score FLOAT DEFAULT 0.5, -- 0-1, confidence in decision
  evaluation_completed BOOLEAN DEFAULT false,
  evaluation_date TIMESTAMP, -- When we evaluated the decision
  accuracy_score FLOAT, -- 0-1, how accurate was the forecast?
  learnings JSONB, -- What we learned from this decision
  readjustment_made BOOLEAN DEFAULT false, -- Did we adjust the next forecast?
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decisions_effectiveness_date ON echo_ai_decisions(decision_effective_date);
CREATE INDEX IF NOT EXISTS decisions_evaluation_status ON echo_ai_decisions(evaluation_completed);
CREATE INDEX IF NOT EXISTS decisions_category ON echo_ai_decisions(decision_category);

-- 7. Forecast Accuracy Tracking (Daily readjustments)
CREATE TABLE IF NOT EXISTS echo_forecast_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES echo_ai_decisions(id) ON DELETE CASCADE,
  evaluation_cycle_date TIMESTAMP NOT NULL, -- When evaluation happened
  predicted_vs_actual JSONB NOT NULL, -- Metric comparisons
  accuracy_percentage FLOAT, -- 0-100, how accurate was forecast?
  contributing_factors TEXT[], -- What affected accuracy?
  readjustment_applied TEXT, -- Adjustments made for next forecast
  next_forecast_updated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forecast_evaluations_date ON echo_forecast_evaluations(evaluation_cycle_date DESC);
CREATE INDEX IF NOT EXISTS forecast_evaluations_accuracy ON echo_forecast_evaluations(accuracy_percentage DESC);

-- 6. Search Query History (Learn from searches)
CREATE TABLE IF NOT EXISTS echo_knowledge_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- User making the query
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL, -- 'code_search', 'explanation', 'fix_request', 'doc_lookup'
  results_found INT,
  result_used BOOLEAN DEFAULT false, -- Did user use the result?
  feedback_score INT, -- 1-5 rating of result quality
  used_persona TEXT, -- 'developer', 'cpa', 'chef', 'teacher'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Context Snapshots (Store session context)
CREATE TABLE IF NOT EXISTS echo_context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  current_module TEXT,
  current_file TEXT,
  current_persona TEXT,
  recent_changes TEXT[], -- Recently modified files
  open_files TEXT[], -- Currently open in editor
  viewport_context JSONB, -- What's on screen
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 8. System Health Metrics (For safe hot-loading)
CREATE TABLE IF NOT EXISTS echo_system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_users INT DEFAULT 0,
  system_load_percent FLOAT DEFAULT 0,
  memory_usage_mb INT DEFAULT 0,
  active_connections INT DEFAULT 0,
  error_rate_percent FLOAT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  last_deployment TIMESTAMP,
  safe_to_deploy BOOLEAN DEFAULT true,
  safe_threshold_users INT DEFAULT 10, -- Max users before marking unsafe
  safe_threshold_load_percent FLOAT DEFAULT 85, -- Max load %
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 9. Deployment Queue (For staged hot-loading)
CREATE TABLE IF NOT EXISTS echo_deployment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  changes_json JSONB NOT NULL, -- Serialized code changes
  requested_by UUID, -- User requesting deployment
  status TEXT DEFAULT 'pending', -- 'pending', 'queued', 'deploying', 'complete', 'rollback'
  priority INT DEFAULT 0,
  requested_at TIMESTAMP DEFAULT NOW(),
  deployed_at TIMESTAMP,
  rollback_to TEXT, -- Backup of previous version
  metadata JSONB -- {files_changed, lines_changed, conflicts}
);

-- 10. AI Conversation Logs (Track all AI interactions)
CREATE TABLE IF NOT EXISTS echo_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT NOT NULL,
  current_persona TEXT,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  reasoning TEXT, -- Why AI chose this response
  confidence_score FLOAT, -- 0-1, how confident in response
  actions_taken TEXT[], -- Code changes, screen takeover, etc
  outcome TEXT, -- 'success', 'partial', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Persona Knowledge Bases (Distinct training for each persona)
CREATE TABLE IF NOT EXISTS echo_persona_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_type TEXT NOT NULL UNIQUE, -- 'developer', 'cpa', 'chef', 'teacher'
  system_prompt TEXT NOT NULL, -- The prompt that defines this persona
  knowledge_domains TEXT[], -- Areas this persona covers
  example_queries TEXT[], -- Common queries for this persona
  custom_rules JSONB, -- {tone, response_style, restrictions}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. Sales Showcase Profiles (For tradeshow mode)
CREATE TABLE IF NOT EXISTS echo_sales_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name TEXT NOT NULL,
  profile_type TEXT NOT NULL, -- 'demo', 'interactive', 'full_interactive'
  description TEXT,
  featured_modules TEXT[], -- Which modules to showcase
  demo_data JSONB, -- Pre-loaded sample data
  is_offline_capable BOOLEAN DEFAULT true,
  offline_cache JSONB, -- Cached responses for offline use
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 13. Echo Learning Settings (User preferences for learning persistence)
CREATE TABLE IF NOT EXISTS echo_learning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  persistent_learning_enabled BOOLEAN DEFAULT true,
  allow_conversation_storage BOOLEAN DEFAULT true,
  allow_pdf_learning BOOLEAN DEFAULT true,
  learning_preferences JSONB, -- {tone, response_style, expertise_level, etc}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. Conversation Learnings (Extracted insights from conversations)
CREATE TABLE IF NOT EXISTS echo_conversation_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  conversation_id UUID REFERENCES echo_ai_conversations(id) ON DELETE CASCADE,
  learning_type TEXT, -- 'preference', 'pattern', 'context', 'skill'
  key_insight TEXT NOT NULL,
  confidence_score FLOAT, -- 0-1, how confident this learning is
  applicable_to TEXT[], -- Persona types this applies to
  context JSONB, -- {domain, module, situation}
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- Optional: when this learning becomes irrelevant
);

-- Index for fast learning lookups
CREATE INDEX IF NOT EXISTS conversation_learnings_user ON echo_conversation_learnings(user_id);
CREATE INDEX IF NOT EXISTS conversation_learnings_type ON echo_conversation_learnings(learning_type);

-- RLS Policies
ALTER TABLE echo_luccca_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_luccca_file_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_pdf_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_knowledge_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_deployment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_persona_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_sales_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_learning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE echo_conversation_learnings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read knowledge base
CREATE POLICY "Users can read knowledge base" ON echo_knowledge_embeddings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read module index" ON echo_luccca_modules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read PDF docs" ON echo_pdf_documents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin can manage deployments
CREATE POLICY "Admins can queue deployments" ON echo_deployment_queue
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Track personal context
CREATE POLICY "Users can manage own context" ON echo_context_snapshots
  FOR ALL USING (user_id = auth.uid());

-- Track personal conversations
CREATE POLICY "Users can view own conversations" ON echo_ai_conversations
  FOR SELECT USING (user_id = auth.uid());

-- Learning settings management
CREATE POLICY "Users can manage own learning settings" ON echo_learning_settings
  FOR ALL USING (user_id = auth.uid());

-- Conversation learnings tracking
CREATE POLICY "Users can view own conversation learnings" ON echo_conversation_learnings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert conversation learnings" ON echo_conversation_learnings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
