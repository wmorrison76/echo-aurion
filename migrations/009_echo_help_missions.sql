/**
 * ECHO HELP SYSTEM - Missions & Articles Storage
 *
 * These tables store help content (missions and articles) fetched from Builder.io.
 * This enables:
 * - Offline access to learning missions (100+ missions)
 * - Fast queries without hitting Builder.io API every time
 * - Ability to sync on-demand or schedule periodically
 * - Full-text search across missions and articles
 *
 * Structure:
 * 1. help_articles: Help article definitions
 * 2. help_missions: Learning mission definitions
 * 3. help_mission_steps: Individual steps within missions
 * 4. help_content_sync: Sync log for tracking when content was last fetched
 */

-- Help articles table
CREATE TABLE IF NOT EXISTS help_articles (
  id VARCHAR(255) PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  module VARCHAR(100),
  route_pattern VARCHAR(255),
  audience_roles TEXT[], -- Array of role strings
  tags TEXT[], -- Array of tag strings
  kcs_state VARCHAR(50) DEFAULT 'draft', -- 'draft', 'verified', 'flagged'
  created_by VARCHAR(255),
  synced_from_builder BOOLEAN DEFAULT FALSE,
  builder_id VARCHAR(255), -- Builder.io content ID
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_module ON help_articles(module);
CREATE INDEX IF NOT EXISTS idx_help_articles_kcs_state ON help_articles(kcs_state);
CREATE INDEX IF NOT EXISTS idx_help_articles_updated_at ON help_articles(updated_at);

-- Full-text search index for articles
CREATE INDEX IF NOT EXISTS idx_help_articles_search ON help_articles 
  USING GIN(to_tsvector('english', title || ' ' || body));

-- Help missions table
CREATE TABLE IF NOT EXISTS help_missions (
  id VARCHAR(255) PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  module VARCHAR(100) NOT NULL,
  difficulty VARCHAR(50) NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'expert'
  roles TEXT[], -- Array of role strings
  synced_from_builder BOOLEAN DEFAULT FALSE,
  builder_id VARCHAR(255), -- Builder.io content ID
  metadata JSONB DEFAULT '{}', -- For additional mission metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT mission_difficulty_check CHECK (difficulty IN ('beginner', 'intermediate', 'expert'))
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_help_missions_slug ON help_missions(slug);
CREATE INDEX IF NOT EXISTS idx_help_missions_module ON help_missions(module);
CREATE INDEX IF NOT EXISTS idx_help_missions_difficulty ON help_missions(difficulty);
CREATE INDEX IF NOT EXISTS idx_help_missions_updated_at ON help_missions(updated_at);

-- Full-text search index for missions
CREATE INDEX IF NOT EXISTS idx_help_missions_search ON help_missions 
  USING GIN(to_tsvector('english', title || ' ' || description));

-- Mission steps table (normalized from mission.steps array)
CREATE TABLE IF NOT EXISTS help_mission_steps (
  id VARCHAR(255) PRIMARY KEY,
  mission_id VARCHAR(255) NOT NULL,
  step_index INT NOT NULL, -- Position in sequence (0-indexed)
  title VARCHAR(500) NOT NULL,
  description TEXT,
  target_selector VARCHAR(255), -- CSS selector for UI targeting
  action_type VARCHAR(50) NOT NULL, -- 'click', 'fill', 'read', 'navigate'
  completion_event VARCHAR(255), -- Event name to listen for completion
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_mission_steps_mission_id FOREIGN KEY (mission_id) 
    REFERENCES help_missions(id) ON DELETE CASCADE,
  CONSTRAINT step_action_type_check CHECK (action_type IN ('click', 'fill', 'read', 'navigate')),
  CONSTRAINT step_index_check CHECK (step_index >= 0),
  UNIQUE(mission_id, step_index)
);

-- Index for mission lookups
CREATE INDEX IF NOT EXISTS idx_mission_steps_mission_id ON help_mission_steps(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_steps_action_type ON help_mission_steps(action_type);

-- Content sync tracking
CREATE TABLE IF NOT EXISTS help_content_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'articles', 'missions', 'all'
  total_synced INT DEFAULT 0,
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  error_message TEXT,
  builder_api_used BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT sync_status_check CHECK (sync_status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- Index for sync tracking
CREATE INDEX IF NOT EXISTS idx_help_content_sync_type ON help_content_sync(content_type);
CREATE INDEX IF NOT EXISTS idx_help_content_sync_status ON help_content_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_help_content_sync_synced_at ON help_content_sync(synced_at);
