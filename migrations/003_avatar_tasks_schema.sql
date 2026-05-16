-- Avatar Tasks Schema
-- Supports autonomous task creation, approval, execution, and audit trail

-- Create avatar_tasks table
CREATE TABLE IF NOT EXISTS avatar_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',
  voice_transcript TEXT NOT NULL,
  action_plan JSONB NOT NULL,
  confidence_score NUMERIC(3, 2) NOT NULL,
  ai_rationale TEXT,
  created_by UUID,
  modified_by UUID,
  execution_started_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create avatar_audit_log table
CREATE TABLE IF NOT EXISTS avatar_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES avatar_tasks(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  action_by UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS avatar_tasks_status_idx ON avatar_tasks(status);
CREATE INDEX IF NOT EXISTS avatar_tasks_created_by_idx ON avatar_tasks(created_by);
CREATE INDEX IF NOT EXISTS avatar_tasks_created_at_idx ON avatar_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS avatar_tasks_task_type_idx ON avatar_tasks(task_type);

CREATE INDEX IF NOT EXISTS avatar_audit_log_task_id_idx ON avatar_audit_log(task_id);
CREATE INDEX IF NOT EXISTS avatar_audit_log_action_idx ON avatar_audit_log(action);
CREATE INDEX IF NOT EXISTS avatar_audit_log_created_at_idx ON avatar_audit_log(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE avatar_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for avatar_tasks
CREATE POLICY "avatar_tasks_select_own" ON avatar_tasks
  FOR SELECT USING (created_by = auth.uid() OR EXISTS(
    SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('manager', 'admin')
  ));

CREATE POLICY "avatar_tasks_insert_authenticated" ON avatar_tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "avatar_tasks_update_own" ON avatar_tasks
  FOR UPDATE USING (created_by = auth.uid() OR EXISTS(
    SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('manager', 'admin')
  ));

-- Create RLS policies for avatar_audit_log
CREATE POLICY "avatar_audit_log_select" ON avatar_audit_log
  FOR SELECT USING (EXISTS(
    SELECT 1 FROM avatar_tasks WHERE id = task_id AND (
      created_by = auth.uid() OR EXISTS(
        SELECT 1 FROM employees WHERE id = auth.uid() AND role IN ('manager', 'admin')
      )
    )
  ));

CREATE POLICY "avatar_audit_log_insert_authenticated" ON avatar_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
