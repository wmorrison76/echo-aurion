-- Neon PostgreSQL Knowledge System Schema
-- Stores extracted knowledge from PDFs for Echo AI learning
-- All knowledge is anonymous and categorized for retrieval

-- 1. Knowledge Categories Table
CREATE TABLE IF NOT EXISTS knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_categories_name ON knowledge_categories(name);

-- 2. Knowledge Items Table (Pure extracted knowledge)
CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES knowledge_categories(id) ON DELETE SET NULL,
  source_file VARCHAR(255),
  file_hash VARCHAR(256),
  enabled BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_category ON knowledge_items(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_enabled ON knowledge_items(enabled);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_file_hash ON knowledge_items(file_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_created ON knowledge_items(created_at DESC);

-- 3. PDF Uploads Tracking Table
CREATE TABLE IF NOT EXISTS pdf_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_size INT,
  file_hash VARCHAR(256),
  extracted_items INT DEFAULT 0,
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdf_uploads_status ON pdf_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_file_hash ON pdf_uploads(file_hash);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created ON pdf_uploads(created_at DESC);

-- 4. Knowledge Search History (for analytics)
CREATE TABLE IF NOT EXISTS knowledge_search (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_search_created ON knowledge_search(created_at DESC);

-- 5. AI Decisions (forecasting and evaluation)
CREATE TABLE IF NOT EXISTS echo_ai_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT NOT NULL UNIQUE,
  decision_category VARCHAR(100),
  decision_context JSONB,
  forecast_days_ahead INT DEFAULT 10,
  decision_made_at TIMESTAMP,
  decision_effective_date TIMESTAMP,
  forecasted_outcome TEXT,
  actual_outcome TEXT,
  confidence_score FLOAT DEFAULT 0.5,
  evaluation_completed BOOLEAN DEFAULT false,
  evaluation_date TIMESTAMP,
  accuracy_score FLOAT,
  learnings JSONB,
  readjustment_made BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_category ON echo_ai_decisions(decision_category);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_evaluation_status ON echo_ai_decisions(evaluation_completed);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_effective_date ON echo_ai_decisions(decision_effective_date);

-- Initialize default categories
INSERT INTO knowledge_categories (name, description)
VALUES
  ('culinary', 'Culinary knowledge: recipes, techniques, ingredients'),
  ('hospitality', 'Hospitality knowledge: service, etiquette, operations'),
  ('financial', 'Financial knowledge: budgeting, forecasting, accounting'),
  ('operations', 'Operations knowledge: processes, procedures, management'),
  ('marketing', 'Marketing knowledge: strategies, campaigns, messaging'),
  ('hr', 'Human resources knowledge: hiring, training, policies'),
  ('training', 'Training knowledge: education, learning, development'),
  ('technology', 'Technology knowledge: systems, integration, architecture'),
  ('general', 'General knowledge: miscellaneous information')
ON CONFLICT (name) DO NOTHING;
