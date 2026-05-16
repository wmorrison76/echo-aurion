-- ChefNet Badge System Schema
-- Supports recognitions, badge tracking, posts, venting, and wellbeing signals

-- Enable UUID and JSON extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chefnet_recognitions table
CREATE TABLE IF NOT EXISTS chefnet_recognitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chefnet_user_badges table
CREATE TABLE IF NOT EXISTS chefnet_user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  points INT DEFAULT 0,
  current_level TEXT DEFAULT 'none',
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, category)
);

-- Create chefnet_user_points_history table
CREATE TABLE IF NOT EXISTS chefnet_user_points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  points_awarded INT NOT NULL,
  trigger_event TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chefnet_posts table
CREATE TABLE IF NOT EXISTS chefnet_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chefnet_venting_messages table
CREATE TABLE IF NOT EXISTS chefnet_venting_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chefnet_wellbeing_signals table
CREATE TABLE IF NOT EXISTS chefnet_wellbeing_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  mood TEXT,
  energy_level INT,
  stress_level INT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chefnet_jobs table
CREATE TABLE IF NOT EXISTS chefnet_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_by_name TEXT NOT NULL,
  posted_by_email TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chefnet_peer_mentorships table
CREATE TABLE IF NOT EXISTS chefnet_peer_mentorships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(mentor_id, mentee_id, topic)
);

-- Create chefnet_resources table
CREATE TABLE IF NOT EXISTS chefnet_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  resource_url TEXT,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chefnet_culture_metrics table (for dashboard aggregations)
CREATE TABLE IF NOT EXISTS chefnet_culture_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  total_recognitions INT DEFAULT 0,
  total_posts INT DEFAULT 0,
  active_members INT DEFAULT 0,
  culture_score NUMERIC(5, 2) DEFAULT 0,
  top_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(organization_id, metric_date)
);

-- Enable RLS (Row Level Security) on all tables
ALTER TABLE chefnet_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_user_points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_venting_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_wellbeing_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_peer_mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE chefnet_culture_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_chefnet_recognitions_sender ON chefnet_recognitions(sender_id, created_at DESC);
CREATE INDEX idx_chefnet_recognitions_recipient ON chefnet_recognitions(recipient_id, created_at DESC);
CREATE INDEX idx_chefnet_recognitions_category ON chefnet_recognitions(category, created_at DESC);
CREATE INDEX idx_chefnet_recognitions_created ON chefnet_recognitions(created_at DESC);

CREATE INDEX idx_chefnet_user_badges_user ON chefnet_user_badges(user_id);
CREATE INDEX idx_chefnet_user_badges_category ON chefnet_user_badges(category);

CREATE INDEX idx_chefnet_user_points_history_user ON chefnet_user_points_history(user_id, created_at DESC);
CREATE INDEX idx_chefnet_user_points_history_trigger ON chefnet_user_points_history(trigger_event);

CREATE INDEX idx_chefnet_posts_user ON chefnet_posts(user_id, created_at DESC);
CREATE INDEX idx_chefnet_posts_created ON chefnet_posts(created_at DESC);

CREATE INDEX idx_chefnet_venting_created ON chefnet_venting_messages(created_at DESC);

CREATE INDEX idx_chefnet_wellbeing_user ON chefnet_wellbeing_signals(user_id, created_at DESC);
CREATE INDEX idx_chefnet_wellbeing_created ON chefnet_wellbeing_signals(created_at DESC);

CREATE INDEX idx_chefnet_jobs_posted_by ON chefnet_jobs(posted_by_id);
CREATE INDEX idx_chefnet_jobs_status ON chefnet_jobs(status);

CREATE INDEX idx_chefnet_mentorships_mentor ON chefnet_peer_mentorships(mentor_id);
CREATE INDEX idx_chefnet_mentorships_mentee ON chefnet_peer_mentorships(mentee_id);

-- RLS Policies for chefnet_recognitions
CREATE POLICY "Recognitions are viewable by all authenticated users"
  ON chefnet_recognitions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own recognitions"
  ON chefnet_recognitions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for chefnet_user_badges
CREATE POLICY "Badges are viewable by all authenticated users"
  ON chefnet_user_badges FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own badges"
  ON chefnet_user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for chefnet_posts
CREATE POLICY "Posts are viewable by all authenticated users"
  ON chefnet_posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own posts"
  ON chefnet_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chefnet_venting_messages
CREATE POLICY "Venting messages are viewable by authenticated users"
  ON chefnet_venting_messages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert venting messages"
  ON chefnet_venting_messages FOR INSERT
  USING (auth.role() = 'authenticated');

-- RLS Policies for chefnet_wellbeing_signals
CREATE POLICY "Wellbeing signals viewable by authenticated users"
  ON chefnet_wellbeing_signals FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own wellbeing signals"
  ON chefnet_wellbeing_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chefnet_jobs
CREATE POLICY "Jobs are viewable by all authenticated users"
  ON chefnet_jobs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own job posts"
  ON chefnet_jobs FOR INSERT
  WITH CHECK (auth.uid() = posted_by_id);

-- RLS Policies for chefnet_resources
CREATE POLICY "Resources are viewable by all authenticated users"
  ON chefnet_resources FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies for chefnet_culture_metrics
CREATE POLICY "Culture metrics are viewable by authenticated users"
  ON chefnet_culture_metrics FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update timestamps
CREATE TRIGGER chefnet_recognitions_update_timestamp
BEFORE UPDATE ON chefnet_recognitions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_user_badges_update_timestamp
BEFORE UPDATE ON chefnet_user_badges
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_posts_update_timestamp
BEFORE UPDATE ON chefnet_posts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_venting_messages_update_timestamp
BEFORE UPDATE ON chefnet_venting_messages
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_wellbeing_signals_update_timestamp
BEFORE UPDATE ON chefnet_wellbeing_signals
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_jobs_update_timestamp
BEFORE UPDATE ON chefnet_jobs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_peer_mentorships_update_timestamp
BEFORE UPDATE ON chefnet_peer_mentorships
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_resources_update_timestamp
BEFORE UPDATE ON chefnet_resources
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER chefnet_culture_metrics_update_timestamp
BEFORE UPDATE ON chefnet_culture_metrics
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
