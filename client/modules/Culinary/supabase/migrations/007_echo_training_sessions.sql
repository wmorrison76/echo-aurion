-- Echo Multi-Domain Training Sessions
-- Stores training session metadata and completion status

CREATE TABLE IF NOT EXISTS echo_training_sessions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  total_knowledge_learned INTEGER DEFAULT 0,
  overall_progress INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS echo_domain_training_states (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES echo_training_sessions(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  exchanges_completed INTEGER DEFAULT 0,
  total_exchanges INTEGER DEFAULT 0,
  knowledge_items_learned INTEGER DEFAULT 0,
  error TEXT,
  learned_knowledge JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_echo_training_sessions_status ON echo_training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_echo_training_sessions_created_at ON echo_training_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echo_domain_training_states_session_id ON echo_domain_training_states(session_id);
CREATE INDEX IF NOT EXISTS idx_echo_domain_training_states_status ON echo_domain_training_states(status);
CREATE INDEX IF NOT EXISTS idx_echo_domain_training_states_profile_id ON echo_domain_training_states(profile_id);
