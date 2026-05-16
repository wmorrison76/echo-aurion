/**
 * ECHO HELP SYSTEM - Skill Tracking & Telemetry
 *
 * These tables track:
 * 1. User skill progress (XP, level, mastery)
 * 2. Skill events (XP awards from missions/learning)
 * 3. Help system telemetry (searches, missions, interactions)
 * 4. Help event log (detailed user interactions)
 *
 * Used for:
 * - User skill dashboards
 * - Learning progress tracking
 * - Gamification (XP, levels, badges)
 * - Help system analytics
 * - Training effectiveness measurement
 */

-- User skill progress tracking
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id VARCHAR(100) NOT NULL,
  xp INT DEFAULT 0,
  level INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, skill_id),
  CONSTRAINT user_skills_xp_check CHECK (xp >= 0),
  CONSTRAINT user_skills_level_check CHECK (level >= 0 AND level <= 5)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_skill ON user_skills(user_id, skill_id);

-- Skill XP events (audit trail)
CREATE TABLE IF NOT EXISTS skill_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id VARCHAR(100) NOT NULL,
  xp_delta INT NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'mission', 'article', 'badge', 'manual', 'admin'
  source_id VARCHAR(255), -- ID of mission, article, badge, etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata for analytics
  org_id UUID,
  location_id UUID,
  
  CONSTRAINT skill_events_xp_delta_check CHECK (xp_delta != 0)
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_skill_events_user_id ON skill_events(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_events_skill_id ON skill_events(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_events_source ON skill_events(source);
CREATE INDEX IF NOT EXISTS idx_skill_events_created_at ON skill_events(created_at);
CREATE INDEX IF NOT EXISTS idx_skill_events_user_skill ON skill_events(user_id, skill_id);

-- Help system telemetry
CREATE TABLE IF NOT EXISTS help_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type VARCHAR(50) NOT NULL, -- 'help.search', 'help.ask', 'help.mission.started', 'help.mission.completed', 'help.article.viewed'
  module VARCHAR(50), -- 'culinary', 'finance', 'banquet', 'labor', 'global'
  route VARCHAR(255), -- current page/route
  role VARCHAR(50), -- user's role
  payload JSONB, -- event-specific data (query, result count, mission ID, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_help_telemetry_user_id ON help_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_help_telemetry_event_type ON help_telemetry(event_type);
CREATE INDEX IF NOT EXISTS idx_help_telemetry_module ON help_telemetry(module);
CREATE INDEX IF NOT EXISTS idx_help_telemetry_created_at ON help_telemetry(created_at);

-- User badges earned
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id VARCHAR(100) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- Mission completion tracking
CREATE TABLE IF NOT EXISTS user_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_id VARCHAR(100) NOT NULL,
  step_index INT DEFAULT 0, -- current step (0-indexed)
  status VARCHAR(20) DEFAULT 'started', -- 'started', 'in_progress', 'completed', 'abandoned'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, mission_id),
  CONSTRAINT mission_status_check CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_mission_progress_user_id ON user_mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_progress_mission_id ON user_mission_progress(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_progress_status ON user_mission_progress(status);
