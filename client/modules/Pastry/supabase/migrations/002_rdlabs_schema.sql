-- R&D Labs Database Schema
-- Phase 1: Core experiment management system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Experiments Table
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hypothesis TEXT,
  specialization TEXT CHECK (specialization IN ('culinary', 'pastry', 'cross-disciplinary')),
  status TEXT CHECK (status IN ('ideation', 'testing', 'ready', 'archived', 'deployed')) DEFAULT 'ideation',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_email TEXT
);

-- Experiment Steps Table
CREATE TABLE IF NOT EXISTS experiment_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  variables TEXT[], -- JSON array of variable names
  observations TEXT,
  results TEXT,
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experiment Variables Table
CREATE TABLE IF NOT EXISTS experiment_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('temperature', 'time', 'ingredient', 'ratio', 'technique', 'other')),
  baseline_value TEXT,
  test_value TEXT,
  unit TEXT,
  is_independent BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insights Table
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  metric_type TEXT CHECK (metric_type IN ('margin', 'guest_sentiment', 'supplier_volatility', 'operational', 'custom')),
  value NUMERIC,
  unit TEXT,
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')) DEFAULT 'stable',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaboration Access Table
CREATE TABLE IF NOT EXISTS experiment_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(experiment_id, user_id)
);

-- Recipe Linking Table
CREATE TABLE IF NOT EXISTS experiment_recipe_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL,
  implementation_notes TEXT,
  status TEXT CHECK (status IN ('linked', 'testing', 'deployed', 'archived')) DEFAULT 'linked',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS experiments_user_id ON experiments(user_id);
CREATE INDEX IF NOT EXISTS experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS experiments_created_at ON experiments(created_at DESC);
CREATE INDEX IF NOT EXISTS experiments_specialization ON experiments(specialization);
CREATE INDEX IF NOT EXISTS experiment_steps_experiment_id ON experiment_steps(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_variables_experiment_id ON experiment_variables(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_access_user_id ON experiment_access(user_id);
CREATE INDEX IF NOT EXISTS experiment_access_experiment_id ON experiment_access(experiment_id);
CREATE INDEX IF NOT EXISTS insights_experiment_id ON insights(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_recipe_links_experiment_id ON experiment_recipe_links(experiment_id);
CREATE INDEX IF NOT EXISTS experiment_recipe_links_recipe_id ON experiment_recipe_links(recipe_id);

-- Row-Level Security Policies

-- Enable RLS on all tables
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_recipe_links ENABLE ROW LEVEL SECURITY;

-- Experiments: Users can view their own experiments or shared ones
CREATE POLICY "experiments_read_own_or_shared" ON experiments
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM experiment_access
      WHERE experiment_access.experiment_id = experiments.id
      AND experiment_access.user_id = auth.uid()
    )
  );

-- Experiments: Users can insert their own experiments
CREATE POLICY "experiments_insert_own" ON experiments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Experiments: Users can update their own experiments or if they have editor role
CREATE POLICY "experiments_update_own_or_editor" ON experiments
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM experiment_access
      WHERE experiment_access.experiment_id = experiments.id
      AND experiment_access.user_id = auth.uid()
      AND experiment_access.role IN ('owner', 'editor')
    )
  );

-- Experiments: Users can delete their own experiments
CREATE POLICY "experiments_delete_own" ON experiments
  FOR DELETE USING (auth.uid() = user_id);

-- Experiment Steps: Inherit access from parent experiment
CREATE POLICY "experiment_steps_read" ON experiment_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_steps.experiment_id
      AND (
        auth.uid() = experiments.user_id
        OR EXISTS (
          SELECT 1 FROM experiment_access
          WHERE experiment_access.experiment_id = experiments.id
          AND experiment_access.user_id = auth.uid()
        )
      )
    )
  );

-- Experiment Variables: Inherit access from parent experiment
CREATE POLICY "experiment_variables_read" ON experiment_variables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_variables.experiment_id
      AND (
        auth.uid() = experiments.user_id
        OR EXISTS (
          SELECT 1 FROM experiment_access
          WHERE experiment_access.experiment_id = experiments.id
          AND experiment_access.user_id = auth.uid()
        )
      )
    )
  );

-- Access Control: Users can view access records for their experiments
CREATE POLICY "experiment_access_read" ON experiment_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_access.experiment_id
      AND auth.uid() = experiments.user_id
    )
  );

-- Access Control: Only experiment owner can grant/revoke access
CREATE POLICY "experiment_access_modify" ON experiment_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_access.experiment_id
      AND auth.uid() = experiments.user_id
    )
  );

-- Recipe Links: Inherit access from parent experiment
CREATE POLICY "experiment_recipe_links_read" ON experiment_recipe_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = experiment_recipe_links.experiment_id
      AND (
        auth.uid() = experiments.user_id
        OR EXISTS (
          SELECT 1 FROM experiment_access
          WHERE experiment_access.experiment_id = experiments.id
          AND experiment_access.user_id = auth.uid()
        )
      )
    )
  );

-- Insights: Inherit access from parent experiment
CREATE POLICY "insights_read" ON insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experiments
      WHERE experiments.id = insights.experiment_id
      AND (
        auth.uid() = experiments.user_id
        OR EXISTS (
          SELECT 1 FROM experiment_access
          WHERE experiment_access.experiment_id = experiments.id
          AND experiment_access.user_id = auth.uid()
        )
      )
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_experiments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_experiment_steps_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_experiment_recipe_links_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
DROP TRIGGER IF EXISTS update_experiments_timestamp ON experiments;
CREATE TRIGGER update_experiments_timestamp
BEFORE UPDATE ON experiments
FOR EACH ROW
EXECUTE FUNCTION update_experiments_timestamp();

DROP TRIGGER IF EXISTS update_experiment_steps_timestamp ON experiment_steps;
CREATE TRIGGER update_experiment_steps_timestamp
BEFORE UPDATE ON experiment_steps
FOR EACH ROW
EXECUTE FUNCTION update_experiment_steps_timestamp();

DROP TRIGGER IF EXISTS update_experiment_recipe_links_timestamp ON experiment_recipe_links;
CREATE TRIGGER update_experiment_recipe_links_timestamp
BEFORE UPDATE ON experiment_recipe_links
FOR EACH ROW
EXECUTE FUNCTION update_experiment_recipe_links_timestamp();

-- Grant permissions (adjust roles as needed for your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON experiments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_variables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experiment_recipe_links TO authenticated;
